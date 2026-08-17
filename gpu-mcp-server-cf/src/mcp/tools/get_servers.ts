import type { McpTool } from './index';
import { queryServersByAbility, getReachability, getServerNotes, getServerPitfalls, listProxies } from '../../db/queries';
import { renderConnectionMode, detectIsChinaMainland, detectLocalProxy, resolveServerGoogleDriveStatus } from '../../models/server';
import { loadAgeSec } from '../../orchestration/load';
import type { ServerNoteEntry } from '../../orchestration/types';

/** Encode a plaintext SSH private key (PEM, ASCII) to single-line base64. */
function encodeKeyB64(keyContent: string | null): string | null {
  if (!keyContent) return null;
  // btoa is available in the Workers runtime; PEM keys are ASCII-safe.
  return btoa(keyContent);
}

/** Parse the stored top_cpu_tasks JSON defensively (never throw into the response). */
function safeParseTasks(raw: string): Array<{ cpu?: number; mem?: number; cmd?: string }> {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.slice(0, 3) : [];
  } catch {
    return [];
  }
}

/** Parse the stored datasets JSON defensively. */
function safeParseDatasets(raw: string): Array<{ name: string; path: string; size_gb?: number }> {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Parse the stored mount_points JSON defensively. */
function safeParseMountPoints(raw?: string | null): Array<{ mount: string; total_gb: number; free_gb: number; is_root?: boolean; is_primary?: boolean }> {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Parse the stored environments JSON defensively. */
function safeParseEnvironments(raw?: string | null): Array<{
  name: string;
  type: string;
  path: string;
  python_version?: string | null;
  torch_version?: string | null;
  cuda_version?: string | null;
  packages?: string[];
  activate_cmd?: string;
  is_primary?: boolean;
}> {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * The one-shot "how do I connect" tool.
 * Returns everything an agent needs to SSH into a server in a single call:
 * server list + credentials + reachable proxies + automatic proxy acceleration suite + a fixed connect guide.
 * Designed so that after context compaction the agent can just call this again
 * and re-obtain the full connection method without remembering anything.
 */
export const getServersTool: McpTool = {
  definition: {
    name: 'get_servers',
    description: '一步获取可用GPU服务器及其完整连接信息、多挂载盘容量与已配好的Python/Conda环境全景。不带参数返回所有在线服务器；每台服务器返回主机、端口、用户名、认证方式、SSH密钥(单行base64)、主工作数据盘路径(primary_data_dir)、多挂载盘剩余空间(mount_points)、已安装的Python/PyTorch/CUDA虚拟环境矩阵(environments)、推荐环境一键激活命令(ready_to_use_commands.env_activate)、可达代理池及代理加速套件。即使长上下文记忆压缩后，调用此工具即可秒级获得完整连接与环境复用指南，严禁盲目重复重装环境。',
    inputSchema: {
      type: 'object',
      properties: {
        gpu_model: { type: 'string', description: '按GPU型号精确过滤，如 "NVIDIA A100"。留空不限。' },
        min_gpu_memory_gb: { type: 'number', description: '最低单卡显存(GB)。' },
        min_ram_gb: { type: 'number', description: '最低内存(GB)。' },
        min_cpu_cores: { type: 'number', description: '最低CPU核心数。' },
        tag: { type: 'string', description: '按标签过滤，如 "training"。' },
        include_offline: { type: 'boolean', default: false, description: '是否包含离线服务器。默认false，只返回在线的。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const gpuModel = args.gpu_model as string | undefined;
    const minGpuMemoryGb = args.min_gpu_memory_gb as number | undefined;
    const minRamGb = args.min_ram_gb as number | undefined;
    const minCpuCores = args.min_cpu_cores as number | undefined;
    const tag = args.tag as string | undefined;
    const includeOffline = args.include_offline === true;

    // Hardware/online filtering happens in SQL; tag filter is applied in-memory
    // because queryServersByAbility does not accept a tag.
    let servers = await queryServersByAbility(db, {
      gpu_model: gpuModel,
      min_ram_gb: minRamGb,
      min_cpu_cores: minCpuCores,
      status_online: includeOffline ? undefined : true,
    });

    if (minGpuMemoryGb !== undefined) {
      servers = servers.filter(s => s.gpu_memory_gb !== null && s.gpu_memory_gb >= minGpuMemoryGb);
    }
    if (tag) {
      servers = servers.filter(s => {
        if (!s.tags) return false;
        try { return (JSON.parse(s.tags) as string[]).includes(tag); }
        catch { return false; }
      });
    }

    const ids = servers.map(s => s.id);
    const notesMap = await getServerNotes(db, ids);
    const pitfallsMap = await getServerPitfalls(db, ids);
    const globalProxies = await listProxies(db);
    const activeGlobalProxies = globalProxies.filter(p => p.is_alive !== 0);
    const now = new Date().toISOString();

    const enriched = await Promise.all(servers.map(async (s) => {
      const reachable = await getReachability(db, s.id);
      const reachableFiltered = reachable.filter(r => r.reachable === 1);

      // Determine proxy pool for this server:
      const proxyList = reachableFiltered.length > 0
        ? reachableFiltered.map(r => ({
            id: r.proxy_id,
            name: r.proxy_name,
            host: r.proxy_host,
            port: r.proxy_port,
            protocol: r.proxy_protocol,
            latency_ms: r.latency_ms,
            region: null as string | null,
          }))
        : activeGlobalProxies.map(p => ({
            id: p.id,
            name: p.name,
            host: p.host,
            port: p.port,
            protocol: p.protocol,
            latency_ms: null as number | null,
            region: p.region ?? null,
          }));

      const sortedProxies = [...proxyList].sort((a, b) => {
        if (a.latency_ms !== null && b.latency_ms !== null) return a.latency_ms - b.latency_ms;
        if (a.latency_ms !== null) return -1;
        if (b.latency_ms !== null) return 1;
        return 0;
      });
      const bestProxy = sortedProxies[0] ?? null;

      const connType = s.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard';

      // Parse mounts and environments
      const parsedMounts = safeParseMountPoints(s.mount_points);
      const parsedEnvs = safeParseEnvironments(s.environments);
      const primaryMount = parsedMounts.find(m => m.is_primary) ?? (parsedMounts.length > 0 ? parsedMounts[0] : null);
      const primaryDataDir = s.primary_data_dir || (primaryMount ? primaryMount.mount : '/root');
      const primaryEnv = parsedEnvs.find(e => e.is_primary) ?? (parsedEnvs.length > 0 ? parsedEnvs[0] : null);
      const envActivateCmd = s.primary_env_cmd || (primaryEnv ? (primaryEnv.activate_cmd || `source ${primaryEnv.path.replace(/\/bin\/python.*$/, '')}/bin/activate`) : null);
      const runWithEnvCmd = primaryEnv ? `${primaryEnv.path} <script.py>` : 'python3 <script.py>';

      // Build automatic proxy acceleration suite when proxies exist
      const proxyAcceleration = bestProxy ? {
        is_proxy_required: s.v2ray_available === 1 && s.direct_when_no_proxy !== 1,
        best_proxy: {
          id: bestProxy.id,
          name: bestProxy.name,
          host: bestProxy.host,
          port: bestProxy.port,
          protocol: bestProxy.protocol,
          url: `${bestProxy.protocol}://${bestProxy.host}:${bestProxy.port}`,
          latency_ms: bestProxy.latency_ms,
          region: bestProxy.region,
        },
        active_proxies_count: sortedProxies.length,
        ready_to_use_commands: {
          ssh_proxy_jump: `ssh -o ProxyCommand="nc -X 5 -x ${bestProxy.host}:${bestProxy.port} %h %p" ${s.auth_method === 'key' ? '-i /tmp/dsh_' + s.id : ''} ${s.username}@${s.host} -p ${s.port}`,
          shell_env_export: `export http_proxy="http://${bestProxy.host}:${bestProxy.port}" https_proxy="http://${bestProxy.host}:${bestProxy.port}" ALL_PROXY="${bestProxy.protocol}://${bestProxy.host}:${bestProxy.port}"`,
          hf_fast_transfer: 'export HF_HUB_ENABLE_HF_TRANSFER=1',
          git_proxy: `git config --global http.proxy "${bestProxy.protocol}://${bestProxy.host}:${bestProxy.port}"`,
          pip_proxy: `pip install --proxy "http://${bestProxy.host}:${bestProxy.port}" <pkg>`,
          curl_proxy: `curl -x "${bestProxy.protocol}://${bestProxy.host}:${bestProxy.port}" <url>`,
          aria2c_proxy: `aria2c --all-proxy="${bestProxy.protocol}://${bestProxy.host}:${bestProxy.port}" -s 16 -x 16 <url>`,
        },
        download_planner_hint: `当需要下载模型/大文件/源码时，调用 MCP 工具 plan_network_relay { target_server_id: "${s.id}", resource_url: "<URL>" } 自动获取直连vs代理并发同源测速竞速与多代理分片并发聚合拉取器。`,
      } : null;

      const serverPitfalls = (pitfallsMap[s.id] ?? []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        workaround: p.workaround,
        severity: p.severity || 'warning',
        tags: p.tags ? (typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags) : [],
        agent: p.agent,
        is_shared: p.is_shared || false,
        source_server_name: p.source_server_name || null,
        provider: p.provider || null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      const parsedTags: string[] = s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [];
      const parsedTasks = s.top_cpu_tasks ? safeParseTasks(s.top_cpu_tasks) : [];
      const isChina = detectIsChinaMainland(s.host, s.provider, parsedTags);
      const localProxyInfo = detectLocalProxy({
        v2ray_available: s.v2ray_available === 1,
        tags: parsedTags,
        notes: s.notes,
        top_cpu_tasks: parsedTasks,
      });
      const gdriveStatus = resolveServerGoogleDriveStatus(isChina, localProxyInfo);

      return {
        id: s.id,
        name: s.name,
        provider: s.provider ?? null,
        host: s.host,
        port: s.port,
        username: s.username,
        auth_method: s.auth_method,
        key_path: s.key_path,
        key_content_b64: encodeKeyB64(s.key_content),
        password: s.password,
        connection_type: connType,
        connection_mode_label: renderConnectionMode({
          v2ray_available: s.v2ray_available === 1,
          direct_when_proxy_available: s.direct_when_proxy_available === 1,
          direct_when_no_proxy: s.direct_when_no_proxy === 1,
        }),
        is_china_mainland: isChina,
        local_proxy_deployed: localProxyInfo.deployed,
        local_proxy_type: localProxyInfo.type,
        local_proxy_usage: localProxyInfo.usage,
        google_drive_enabled: gdriveStatus.enabled,
        google_drive_status: gdriveStatus.status_label,
        gpu_model: s.gpu_model,
        gpu_memory_gb: s.gpu_memory_gb,
        cpu_cores: s.cpu_cores,
        ram_gb: s.ram_gb,
        disk_gb: s.disk_gb,
        online: s.status_online === 1,
        ping_ms: s.status_ping_ms,
        is_jump_host: s.is_jump_host === 1,
        tags: parsedTags,
        notes: s.notes,
        gpu_count: s.gpu_count,
        gpu_sharing_mode: s.gpu_sharing_mode,
        gpu_util_pct: s.gpu_util_pct,
        gpu_mem_free_gb: s.gpu_mem_free_gb,
        ram_free_gb: s.ram_free_gb,
        disk_free_gb: s.disk_free_gb,
        running_tasks: s.running_tasks,
        python_version: s.python_version,
        torch_version: s.torch_version,
        cuda_version: s.cuda_version,
        // Storage & Multi-mount topology
        primary_data_dir: primaryDataDir,
        mount_points: parsedMounts,
        // Environment Matrix & Activation Commands
        primary_env: primaryEnv,
        environments: parsedEnvs,
        ready_to_use_commands: {
          ssh_connect: s.auth_method === 'password'
            ? `sshpass -p '${s.password}' ssh -o StrictHostKeyChecking=no ${s.username}@${s.host} -p ${s.port} (或使用 paramiko/sshrun.py)`
            : `ssh -i /tmp/dsh_${s.id} -o StrictHostKeyChecking=no ${s.username}@${s.host} -p ${s.port}`,
          env_activate: envActivateCmd,
          run_with_env: runWithEnvCmd,
          create_project_workspace: `mkdir -p ${primaryDataDir}/projects/{project_name}_$(date +%Y%m%d_%H%M%S)/output && cd $_`,
          gdrive_setup: gdriveStatus.setup_command,
          gdrive_push: gdriveStatus.push_command,
          gdrive_pull: gdriveStatus.pull_command,
          register_env_hint: '若在此服务器配置了全新环境，调用 register_environment { server_id: "' + s.id + '", name: "...", path: "..." } 永久沉淀进集体记忆！',
        },
        top_cpu_tasks: s.top_cpu_tasks ? safeParseTasks(s.top_cpu_tasks) : [],
        datasets: s.datasets ? safeParseDatasets(s.datasets) : [],
        server_expires_at: s.server_expires_at ?? null,
        server_remaining_minutes: s.server_expires_at ? Math.round((new Date(s.server_expires_at).getTime() - Date.now()) / 60000) : null,
        is_server_expiring_soon: s.server_expires_at ? (Math.round((new Date(s.server_expires_at).getTime() - Date.now()) / 60000) <= 60) : false,
        current_task: s.current_task,
        current_agent: s.current_agent,
        task_started_at: s.task_started_at,
        task_duration_minutes: s.task_duration_minutes ?? null,
        task_expires_at: s.task_expires_at ?? null,
        task_remaining_minutes: s.task_expires_at ? Math.round((new Date(s.task_expires_at).getTime() - Date.now()) / 60000) : null,
        remaining_minutes: s.task_expires_at ? Math.round((new Date(s.task_expires_at).getTime() - Date.now()) / 60000) : null,
        is_task_expired: s.task_expires_at ? (new Date(s.task_expires_at).getTime() - Date.now()) <= 0 : false,
        load_age_sec: loadAgeSec(s, now),
        notes_entries: (notesMap[s.id] ?? []).map(n => ({
          topic: n.topic,
          content: n.content,
          is_shared: n.is_shared || false,
          source_server_name: n.source_server_name || null,
          provider: n.provider || null,
          updated_by: n.updated_by,
          updated_at: n.updated_at,
        })) as ServerNoteEntry[],
        pitfalls_count: serverPitfalls.length,
        pitfalls: serverPitfalls,
        reachable_proxies: sortedProxies.map(r => ({
          id: r.id,
          name: r.name,
          host: r.host,
          port: r.port,
          protocol: r.protocol,
          url: `${r.protocol}://${r.host}:${r.port}`,
          latency_ms: r.latency_ms,
        })),
        proxy_acceleration: proxyAcceleration,
      };
    }));

    const how_to_connect =
      '【集群连接与研发标准规范 (SOP)】\n' +
      '1. 认证与连接 (auth_method & connection_type):\n' +
      '   - 密码认证 (auth_method: "password"): 直接使用返回的 `password` 字段。使用 `sshpass -p "<password>" ssh ...` 或 python sshrun.py / paramiko 连接，非凭证缺失！\n' +
      '   - 密钥认证 (auth_method: "key"): echo "<key_content_b64>" | base64 -d > /tmp/dsh_<id> && chmod 600 /tmp/dsh_<id>，然后 ssh -i /tmp/dsh_<id> <username>@<host> -p <port>。\n' +
      '   - cloudflare_tunnel: ssh -o ProxyCommand="cloudflared access ssh --hostname %h" -i <key> <username>@<host>\n' +
      '2. 📁【新建项目文件夹 (必须使用 primary_data_dir 大容量挂载盘)】: \n' +
      '   - 每次调用服务器做一次实验，**必须建立在 primary_data_dir 主数据盘下**（严禁建在小容量系统根目录 /root 下！）：\n' +
      '     `mkdir -p <primary_data_dir>/projects/{project_name}_{YYYYMMDD_HHMMSS}/output && cd $_`；\n' +
      '   - 本次实验专属的代码、配置、脚本、训练指标、日志及最终产出**全部保存在该项目文件夹内**！\n' +
      '3. 🌐【环境依赖复用第一定律 (使用 primary_env 与 env_activate，严禁重复重装)】: \n' +
      '   - **直接复用已有环境**：连接后优先检查 `primary_env`，直接执行 `ready_to_use_commands.env_activate`（或使用 `run_with_env` 指定解释器执行）。\n' +
      '   - **严禁在项目文件夹重复创建 .venv / 重复 pip install torch**，确保一次配置、全机所有实验与后续 Agent 永久共享！\n' +
      '   - **新环境主动登记**：若在此机配了全新环境，必须调用 `register_environment` 固化进集体记忆。\n' +
      '   - **数据集/模型独立全局目录**：通用数据集统一存放于 `<primary_data_dir>/shared/datasets/` (并调用 `register_dataset` 登记)；基座模型权重统一存放于 `<primary_data_dir>/shared/models/` 或全局缓存目录，绝不重复下载！\n' +
      '4. 🔒【SOCKS5 代理池专用原则】: \n' +
      '   - 集群 SOCKS5 代理池 (reachable_proxies) **仅专门作为 SSH 跳板连接代理使用** (如直连超时时使用 ready_to_use_commands.ssh_proxy_jump)；\n' +
      '   - **严禁将 SOCKS5 代理池作为任何文件/依赖下载任务的代理！** 缺失依赖/下载请对比国内镜像源与服务器本机本地代理 (/etc/profile.d/00-proxy.sh) 测速拉取。\n' +
      '5. ⚠️【同运营商 (Provider) 踩坑与避坑经验全自动共享】: \n' +
      '   - 每台服务器返回的 pitfalls 与 notes_entries 已自动聚合当前服务器及同运营商（如 AutoDL、RunPod 等）其他服务器的历史避坑经验与专题笔记（带 is_shared 标识）。遇到任何报错第一顺位调用 query_troubleshooting；若摸索出新避坑方案，必须调用 record_pitfall 沉淀进集体记忆，全网同运营商机器永久共享！\n' +
      '6. 🌐【本地出海代理部署感知与 Google Drive 规则】: \n' +
      '   - 每台服务器返回 `local_proxy_deployed` (True/False)、`local_proxy_usage` (具体用法如 source /etc/profile.d/00-proxy.sh) 与 `is_china_mainland`；\n' +
      '   - 若位于中国大陆且已部署 sing-box/本地代理，Google Drive 默认自动走 sing-box (127.0.0.1:10809) 代理通道进行同步；\n' +
      '   - 若位于中国大陆且未部署本地出海代理，Google Drive 已自动禁用 (`google_drive_enabled: false`)，必须先部署出海代理后方可使用；\n' +
      '   - 若位于海外节点，Google Drive 默认直连高速可用。\n' +
      '7. 📦【数据备份与释放】: \n' +
      '   - 实验结束调用 plan_server_backup { remote_data_dir: "<primary_data_dir>/projects/{project}/output", ... } 智能备份实验产出，随后调用 release_server 释放算力。';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ how_to_connect, count: enriched.length, servers: enriched }),
      }],
    };
  },
};
