import type { McpTool } from './index';
import { queryServersByAbility, getReachability, getServerNotes } from '../../db/queries';
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
 * server list + credentials + reachable proxies + a fixed connect guide.
 * Designed so that after context compaction the agent can just call this again
 * and re-obtain the full connection method without remembering anything.
 */
export const getServersTool: McpTool = {
  definition: {
    name: 'get_servers',
    description: '一步获取可用GPU服务器及其完整连接信息。不带参数返回所有在线服务器；可按 gpu_model / 最低配置 / 标签过滤。每台服务器返回主机、端口、用户名、认证方式、SSH密钥(单行base64,不含换行)、连接方式标签和可达代理。响应顶部的 how_to_connect 说明如何用这些信息建立SSH连接。需要服务器时调用这一个工具即可，无需多步。',
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
    const now = new Date().toISOString();

    const enriched = await Promise.all(servers.map(async (s) => {
      const reachable = await getReachability(db, s.id);
      const connType = s.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard';
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
        reachable_proxies: reachable
          .filter(r => r.reachable === 1)
          .map(r => ({ id: r.proxy_id, name: r.proxy_name, host: r.proxy_host, port: r.proxy_port, protocol: r.proxy_protocol, latency_ms: r.latency_ms })),
      };
    }));

    const how_to_connect =
      'connection_type=cloudflare_tunnel 的服务器: host 是隧道域名, SSH 需用 ' +
      'ssh -o ProxyCommand="cloudflared access ssh --hostname %h" -i <key> <username>@<host> ' +
      '(本机需安装 cloudflared 并已 cloudflared login)。\n' +
      'connection_type=standard(默认): ' +
      'key认证: key_content_b64 是单行base64的SSH私钥(无换行,抗压缩)。' +
      'echo "<key_content_b64>" | base64 -d > /tmp/dsh_<id> && chmod 600 /tmp/dsh_<id>，' +
      '然后 ssh -i /tmp/dsh_<id> <username>@<host> -p <port>。' +
      '若本机 key_path 文件已存在可直接 ssh -i <key_path>。' +
      'password认证: 用 password 字段直接登录。' +
      '若 connection_mode_label 含"代理"或直连不通，用 reachable_proxies 中延迟最低的代理: ' +
      'ssh -o ProxyCommand="nc -X 5 -x <proxy.host>:<proxy.port> %h %p" -i <key> <username>@<host> -p <port>。' +
      '运维知识见 notes_entries(按 topic),如 global_proxy 的用法/注意事项。';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ how_to_connect, count: enriched.length, servers: enriched }),
      }],
    };
  },
};
