import type { McpTool } from './index';
import { queryServersByAbility, getReachability, getServerNotes, getServerPitfalls, listProxies } from '../../db/queries';
import { renderConnectionMode } from '../../models/server';
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
    description: '一步获取可用GPU服务器及其完整连接信息与代理加速套件。不带参数返回所有在线服务器；可按 gpu_model / 最低配置 / 标签过滤。每台服务器返回主机、端口、用户名、认证方式、SSH密钥(单行base64,不含换行)、连接方式标签、可达代理池、以及遇到需要代理时自动生成的 proxy_acceleration 命令套件(SSH跳板命令、Shell/Git/Pip/Wget环境变量、HF极速传输)。响应顶部的 how_to_connect 说明如何用这些信息建立SSH连接与加速。需要服务器时调用这一个工具即可，无需多步。',
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
      // If reachability has probed records, use them. If not, fallback to active global proxies.
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

      // Sort by latency ascending (known latencies first)
      const sortedProxies = [...proxyList].sort((a, b) => {
        if (a.latency_ms !== null && b.latency_ms !== null) return a.latency_ms - b.latency_ms;
        if (a.latency_ms !== null) return -1;
        if (b.latency_ms !== null) return 1;
        return 0;
      });
      const bestProxy = sortedProxies[0] ?? null;

      const connType = s.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard';

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
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      return {
        id: s.id,
        name: s.name,
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
        gpu_model: s.gpu_model,
        gpu_memory_gb: s.gpu_memory_gb,
        cpu_cores: s.cpu_cores,
        ram_gb: s.ram_gb,
        disk_gb: s.disk_gb,
        online: s.status_online === 1,
        ping_ms: s.status_ping_ms,
        is_jump_host: s.is_jump_host === 1,
        tags: s.tags ? JSON.parse(s.tags) : [],
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
          topic: n.topic, content: n.content, updated_by: n.updated_by, updated_at: n.updated_at,
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
      '1. 认证与连接 (connection_type):\n' +
      '   - standard (直连/默认): echo "<key_content_b64>" | base64 -d > /tmp/dsh_<id> && chmod 600 /tmp/dsh_<id>，然后 ssh -i /tmp/dsh_<id> <username>@<host> -p <port>。\n' +
      '   - cloudflare_tunnel: ssh -o ProxyCommand="cloudflared access ssh --hostname %h" -i <key> <username>@<host>\n' +
      '2. 📁【新建项目文件夹 (实验产出隔离)】: \n' +
      '   - 每次调用服务器做一次实验，**必须建立一个独立的项目文件夹**：`~/projects/{project_name}_{YYYYMMDD_HHMMSS}/` (如 `mkdir -p ~/projects/infer_distilbert_20260815_185830/output`)；\n' +
      '   - 本次实验专属的代码、配置、脚本、训练指标、日志及最终产出**全部保存在该项目文件夹内**！\n' +
      '3. 🌐【环境依赖全局安装 + 数据集/模型独立全局存储】: \n' +
      '   - **环境依赖全局生效**：Python 依赖包必须全局安装生效 (如 `pip install --break-system-packages` 或 base conda 环境)，严禁在每个实验文件夹重复创建 .venv 和反复重装，确保一次安装、全机所有实验与后续 Agent 永久共享！\n' +
      '   - **数据集/模型独立全局目录**：通用数据集统一存放于 `~/shared/datasets/` (并调用 `register_dataset` 登记)；基座模型权重统一存放于 `~/shared/models/` 或全局缓存目录，实验代码直接引用，绝不重复下载或冗余堆放在项目文件夹内！\n' +
      '4. 🔒【SOCKS5 代理池专用原则】: \n' +
      '   - 集群 SOCKS5 代理池 (reachable_proxies) **仅专门作为 SSH 跳板连接代理使用** (如直连超时时使用 ready_to_use_commands.ssh_proxy_jump)；\n' +
      '   - **严禁将 SOCKS5 代理池作为任何文件/依赖下载任务的代理！** 缺失依赖/下载请对比国内镜像源与服务器本机本地代理 (/etc/profile.d/00-proxy.sh) 测速拉取。\n' +
      '5. ⚠️【踩坑与避坑经验 (Pitfalls)】: \n' +
      '   - 每台服务器均返回 pitfalls 踩坑列表。遇到任何报错第一顺位调用 query_troubleshooting；若摸索出新避坑方案，必须调用 record_pitfall 沉淀进集体记忆！\n' +
      '6. 📦【数据备份与释放】: \n' +
      '   - 实验结束调用 plan_server_backup { remote_data_dir: "~/projects/{project}/output", ... } 智能备份实验产出，随后调用 release_server 释放算力。';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ how_to_connect, count: enriched.length, servers: enriched }),
      }],
    };
  },
};
