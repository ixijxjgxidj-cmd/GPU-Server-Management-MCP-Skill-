import type { McpTool } from './index';
import type { DBServer } from '../../db/schema';
import { getServerById, listServers, upsertBackupIndex } from '../../db/queries';

export const planServerBackupTool: McpTool = {
  definition: {
    name: 'plan_server_backup',
    description: '规划服务器数据备份任务并同步写入 MCP RAG 向量索引库：\n\n【智能双模备份决策规则】：\n1. 【物理剩余时间 > 1 小时 或 永久机】：仅备份本轮实验产出（模型权重/检查点/日志/配置），坚决不备份/不转移庞大数据集，数据集保留在节点供后续任务享受 Dataset Affinity 亲和调度；\n2. 【物理剩余时间 <= 1 小时（即将关机/销毁）】：按原完整分级疏散备份策略执行（1. GDrive 全量 -> 2. 对端服务器中转并登记数据集 -> 3. 本地核心私有权重过滤下载）。\n\n所有备份将自动以源机 IP 为唯一锚点写入 MCP RAG 索引库（若机器被删除，索引自动同步清理）。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '源服务器ID (来自 get_servers)' },
        session_name: { type: 'string', description: '当前会话/任务名称，如 "train_lora_qwen"' },
        summary: { type: 'string', description: '产物/数据内容简介，如 "best_checkpoint_epoch5"' },
        has_google_drive: { type: 'boolean', description: '源服务器是否已挂载 Google Drive (默认 false)' },
        remote_data_dir: { type: 'string', description: '源服务器上本次实验专属项目文件夹的产物路径，如 "~/projects/train_lora_20260815_140200/output"' },
        target_peer_server_id: { type: 'string', description: '可选：指定的存储对端服务器ID。若不填则自动挑选空闲磁盘最大的在线服务器' },
        force_local_backup: { type: 'boolean', description: '可选：强制下载到本地，跳过对端服务器中转 (默认 false)' },
        data_purpose: { type: 'string', description: '数据用途描述，如 "用于阶段性评测与部署推理"' },
        data_usage_status: { type: 'string', description: '数据使用情况描述，如 "已完成 5 轮训练，验证集 loss 达 0.18"' },
      },
      required: ['server_id', 'session_name', 'summary'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const sessionName = ((args.session_name as string) || 'default_session').replace(/[^a-zA-Z0-9_-]/g, '_');
    const summary = ((args.summary as string) || 'data_backup').replace(/[^a-zA-Z0-9_-]/g, '_');
    const hasGDrive = Boolean(args.has_google_drive);
    const remoteDir = (args.remote_data_dir as string) || '/root/output';
    const targetPeerId = args.target_peer_server_id as string | undefined;
    const forceLocal = Boolean(args.force_local_backup);
    const rawPurpose = (args.data_purpose as string) || '模型训练/评测产物备份';
    const rawUsageStatus = (args.data_usage_status as string) || '任务阶段产物';

    const server = await getServerById(db, serverId);
    if (!server) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Server not found: ${serverId}` }],
      };
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const folderName = `${timestamp}_${sessionName}_${summary}`;
    const localFolder = `server_backups/${folderName}`;

    // =========================================================================
    // 核心决策：计算物理服务器剩余存活时间 (Physical Lease vs Task Outputs)
    // =========================================================================
    const serverRemainingMin = server.server_expires_at
      ? Math.round((new Date(server.server_expires_at).getTime() - now.getTime()) / 60000)
      : null;
    const isPhysicalExpiringSoon = serverRemainingMin !== null && serverRemainingMin <= 60;

    const strategyMode = isPhysicalExpiringSoon ? 'full_evacuation_backup' : 'experiment_outputs_only';
    const purpose = isPhysicalExpiringSoon
      ? `[物理临期全量疏散] ${rawPurpose}`
      : `[单轮实验产出备份] ${rawPurpose}`;
    const usageStatus = isPhysicalExpiringSoon
      ? `${rawUsageStatus} (⚠️ 物理服务器仅剩 ${serverRemainingMin} 分钟，机器即将回收)`
      : `${rawUsageStatus} (💡 物理机寿命充裕 ${serverRemainingMin !== null ? `剩余 ${serverRemainingMin} 分钟` : '永久机'}，数据集保留在节点)`;

    let planMarkdown = '';

    const decisionBanner = isPhysicalExpiringSoon
      ? `> ⚠️ **【紧急疏散备份模式】**：检测到服务器物理剩余时间 **<= 1 小时 (剩余 ${serverRemainingMin} 分钟)**，机器即将关机/销毁！\n> **策略**：执行全量数据与资产疏散备份，防止数据集与模型产物丢失。\n`
      : `> 💡 **【单轮实验产出备份模式】**：检测到服务器物理剩余时间 **> 1 小时 (${serverRemainingMin !== null ? `剩余 ${serverRemainingMin} 分钟` : '永久物理机'})**。\n> **策略**：仅备份本轮实验核心产出（权重/检查点/日志/配置），**坚决不备份、不转移数据集**，数据集继续保留在节点以维持 Dataset Affinity 加权优势！\n`;

    // ==========================================
    // 顺位 1：Google Drive 挂载备份
    // ==========================================
    if (hasGDrive) {
      const gdriveRemotePath = `/content/drive/MyDrive/server_backups/${folderName}`;
      const indexJson = {
        backup_type: isPhysicalExpiringSoon ? 'google_drive_full_evacuation' : 'google_drive_experiment_outputs',
        strategy_mode: strategyMode,
        server_remaining_minutes: serverRemainingMin,
        priority_level: 1,
        google_drive_path: gdriveRemotePath,
        folder_name: folderName,
        session_name: sessionName,
        summary: summary,
        purpose: purpose,
        usage_status: usageStatus,
        source_server: {
          id: server.id,
          name: server.name,
          host: server.host,
        },
        backed_up_at: now.toISOString(),
      };

      // 同步写入 MCP D1 向量/语义备份索引库 (以 server.host 为唯一计量锚点)
      await upsertBackupIndex(db, {
        server_host: server.host,
        server_id: server.id,
        folder_name: folderName,
        session_name: sessionName,
        summary: summary,
        backup_type: 'google_drive',
        purpose: purpose,
        usage_status: usageStatus,
        remote_path: gdriveRemotePath,
        metadata_json: JSON.stringify(indexJson),
      });

      planMarkdown = `### 📦 【第 1 顺位】Google Drive ${isPhysicalExpiringSoon ? '全量疏散' : '实验产物'}备份方案

${decisionBanner}
> **RAG 向量索引**：已自动以源机 IP (\`${server.host}\`) 锚定上传至 MCP 数据库。

1. **环境准备（若未配置 Google Drive rclone 环境，执行一键配置）**：
\`\`\`bash
curl -fsSL https://dsh-mcp-server.hulkcheng0806.workers.dev/api/gdrive/setup.sh | bash
\`\`\`

2. **在源服务器上执行极速同步至 Google Drive**：
\`\`\`bash
${isPhysicalExpiringSoon
  ? `gdrive-push "${remoteDir}" "${folderName}"`
  : `gdrive-push "${remoteDir}" "${folderName}"`
}
\`\`\`

3. **在本地建立索引文件夹与元数据**：
本地路径：\`${localFolder}/\`
写入索引文件：\`${localFolder}/google_drive_index.json\`
\`\`\`json
${JSON.stringify(indexJson, null, 2)}
\`\`\`

4. **实时查看与智能体检索**：
- **Web 仪表盘实时查看**：登录控制台「📁 云盘存储 (Drive)」可实时查看已备份的文件与大小。
- **Agent MCP 实时调用**：后续任务需要此数据时，调用 \`list_gdrive_files { query: "${folderName}" }\` 或 \`query_backup_index\` 即可秒级定位文件。`;

    } else {
      // 查询是否有集群其他可用服务器
      const allServers = await listServers(db, undefined, true);
      let peerServer: DBServer | null = null;

      if (!forceLocal) {
        if (targetPeerId) {
          peerServer = allServers.find((s: DBServer) => s.id === targetPeerId && s.id !== server.id) || null;
        } else {
          // 挑选其他在线且空闲硬盘最大的服务器（优先选择非临期服务器）
          const candidatePeers = allServers
            .filter((s: DBServer) => s.id !== server.id && s.status_online === 1 && s.enabled === 1)
            .sort((a: DBServer, b: DBServer) => (b.disk_free_gb ?? b.disk_gb ?? 0) - (a.disk_free_gb ?? a.disk_gb ?? 0));
          if (candidatePeers.length > 0) {
            peerServer = candidatePeers[0];
          }
        }
      }

      // ==========================================
      // 顺位 2：集群其他服务器中转与存储
      // ==========================================
      if (peerServer) {
        const peerRemoteDir = `/data/server_backups/${folderName}`;
        const peerConnectCmd = peerServer.connection_type === 'cloudflare_tunnel'
          ? `ssh -o ProxyCommand="cloudflared access ssh --hostname %h" ${peerServer.username}@${peerServer.host}`
          : `ssh ${peerServer.username}@${peerServer.host} -p ${peerServer.port}`;

        const peerIndexJson = {
          backup_type: isPhysicalExpiringSoon ? 'peer_server_full_evacuation' : 'peer_server_experiment_outputs',
          strategy_mode: strategyMode,
          server_remaining_minutes: serverRemainingMin,
          priority_level: 2,
          folder_name: folderName,
          session_name: sessionName,
          summary: summary,
          purpose: purpose,
          usage_status: usageStatus,
          source_server: {
            id: server.id,
            name: server.name,
            host: server.host,
          },
          peer_server: {
            id: peerServer.id,
            name: peerServer.name,
            host: peerServer.host,
            port: peerServer.port,
            username: peerServer.username,
            auth_method: peerServer.auth_method,
            connection_type: peerServer.connection_type,
            how_to_connect: peerConnectCmd,
            remote_path: peerRemoteDir,
          },
          file_data_index: {
            remote_path: peerRemoteDir,
            content_summary: summary,
            description: purpose,
          },
          backed_up_at: now.toISOString(),
        };

        // 同步写入 MCP D1 向量/语义备份索引库 (以 server.host 为唯一计量锚点)
        await upsertBackupIndex(db, {
          server_host: server.host,
          server_id: server.id,
          folder_name: folderName,
          session_name: sessionName,
          summary: summary,
          backup_type: 'peer_server',
          purpose: purpose,
          usage_status: usageStatus,
          remote_path: peerRemoteDir,
          peer_server_host: peerServer.host,
          peer_connect_cmd: peerConnectCmd,
          metadata_json: JSON.stringify(peerIndexJson),
        });

        planMarkdown = `### 🔄 【第 2 顺位】集群服务器中转备份方案

${decisionBanner}
> 数据优先传输至对端服务器 **${peerServer.name}** (${peerServer.host}) 存储，本地 \`server_backups\` **仅留存：服务器地址 + 连接方法 + 文件数据索引**。
> **RAG 向量索引**：已自动以源机 IP (\`${server.host}\`) 锚定上传至 MCP 数据库。

1. **在源服务器执行数据同步至对端服务器**：
\`\`\`bash
# 直连对端传输${isPhysicalExpiringSoon ? '（全量数据及产物）' : '（仅限本轮实验产物，排除数据集）'}：
rsync -avzP -e "ssh -p ${peerServer.port}" ${isPhysicalExpiringSoon ? '' : '--exclude="*dataset*" --exclude="*data*" '} "${remoteDir}/" ${peerServer.username}@${peerServer.host}:"${peerRemoteDir}/"
\`\`\`

2. **在对端服务器上登记该产物/数据集 (Dataset Affinity)**：
\`\`\`yaml
register_dataset {
  server_id: "${peerServer.id}",
  name: "${sessionName}_${summary}",
  path: "${peerRemoteDir}",
  size_gb: 0  # 填入实际预估大小
}
\`\`\`

3. **在本地建立备份文件夹及轻量索引**：
本地路径：\`${localFolder}/\`
写入索引文件：\`${localFolder}/peer_server_index.json\`
\`\`\`json
${JSON.stringify(peerIndexJson, null, 2)}
\`\`\`

4. **后续检索指引**：
后续任务若需要此数据，调用 \`query_backup_index\` 或本地 \`everything-mcp\` 查询本地 \`${localFolder}\`，命中 \`peer_server_index.json\` 后直接根据连接方法前往 **${peerServer.host}** 读取，或在 \`plan_task_allocation\` 中直接以 10 万分加权调度至该节点！`;

      } else {
        // ==========================================
        // 顺位 3：本地核心产物下载 (仅限无法外部重新下载的数据)
        // ==========================================
        const localIndexJson = {
          backup_type: isPhysicalExpiringSoon ? 'local_full_evacuation_core' : 'local_irreplaceable_weights_only',
          strategy_mode: strategyMode,
          server_remaining_minutes: serverRemainingMin,
          priority_level: 3,
          local_folder: localFolder,
          folder_name: folderName,
          session_name: sessionName,
          summary: summary,
          purpose: purpose,
          usage_status: usageStatus,
          source_server: {
            id: server.id,
            name: server.name,
            host: server.host,
          },
          backed_up_at: now.toISOString(),
          filter_rule: '仅下载最重要且无法从外部途径(HuggingFace/ModelScope/开源链接)重新下载的私有训练权重(*.safetensors, *.bin, *.pt, *.pth)、训练日志与配置文件；公开数据集与基座模型一律不下载。',
        };

        // 同步写入 MCP D1 向量/语义备份索引库 (以 server.host 为唯一计量锚点)
        await upsertBackupIndex(db, {
          server_host: server.host,
          server_id: server.id,
          folder_name: folderName,
          session_name: sessionName,
          summary: summary,
          backup_type: 'local_weights',
          purpose: purpose,
          usage_status: usageStatus,
          remote_path: localFolder,
          metadata_json: JSON.stringify(localIndexJson),
        });

        const keyFlag = server.key_path ? `-i "${server.key_path}"` : (server.auth_method === 'key' ? `-i /tmp/dsh_${server.id}` : '');

        planMarkdown = `### 📥 【第 3 顺位】本地核心产物备份方案

${decisionBanner}
> **严格红线**：【只下载最重要的无法从外部途径下载的私有权重/检查点/日志/配置】，公开数据集与开源基座模型一律不下载到本地。
> **RAG 向量索引**：已自动以源机 IP (\`${server.host}\`) 锚定上传至 MCP 数据库。

1. **在本地创建存储目录**：
\`\`\`bash
mkdir -p "${localFolder}"
\`\`\`

2. **下载私有核心权重（严格过滤外部可下载的大数据集与基座模型）**：
\`\`\`bash
rsync -avzP -e "ssh ${keyFlag} -p ${server.port}" \\
  --include="*/" \\
  --include="*lora*" \\
  --include="*adapter*" \\
  --include="*checkpoint*" \\
  --include="*.safetensors" \\
  --include="*.bin" \\
  --include="*.pt" \\
  --include="*.pth" \\
  --include="*.json" \\
  --include="*.yaml" \\
  --include="*.yml" \\
  --include="*.log" \\
  --include="*.txt" \\
  --include="*.py" \\
  --exclude="*dataset*" \\
  --exclude="*data*" \\
  --exclude="*.arrow" \\
  --exclude="*.parquet" \\
  --exclude="*.tar*" \\
  --exclude="*.zip*" \\
  --exclude="*.gz" \\
  --exclude="*" \\
  ${server.username}@${server.host}:"${remoteDir}/" "${localFolder}/"
\`\`\`

3. **在本地写入索引文件**：
写入索引文件：\`${localFolder}/LOCAL_INDEX.json\`
\`\`\`json
${JSON.stringify(localIndexJson, null, 2)}
\`\`\`

4. **后续检索指引**：
后续任务若需要此数据，调用 \`query_backup_index\` 或本地 \`everything-mcp\` 查询本地 \`${localFolder}\` 即可直接定位使用。`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: `${planMarkdown}\n\n5. **完成释放**：备份完成后，请主动调用 \`release_server { server_id: "${server.id}", task_done: true }\` 释放算力。`,
      }],
    };
  },
};
