import type { McpTool } from './index';
import { listServers, updateServerStatus } from '../../db/queries';
import { tcpPing } from '../../probe/ping';

async function probeSingleServer(serverId: string, host: string, port: number) {
  const result = await tcpPing(host, port);
  return { server_id: serverId, ...result };
}

export const batchProbeServersTool: McpTool = {
  definition: {
    name: 'batch_probe_servers',
    description: '并发探测多台服务器的TCP连通性（SSH端口）。当你需要快速了解集群中哪些服务器在线、或者在执行分布式任务前检查一批服务器的可用性时使用。所有服务器**并发**探测，耗时约为最慢单台的时间。结果会批量更新每台服务器的在线状态。注意：这是只测试直连，不测试代理。如需完整测试（含代理），请对每台单独调用 verify_server_connectivity。',
    inputSchema: {
      type: 'object',
      properties: {
        server_ids: {
          type: 'array',
          items: { type: 'string' },
          description: '要探测的服务器ID列表。不提供则探测所有服务器。ID 从 list_servers 获取。',
        },
        tag: { type: 'string', description: '按标签过滤。与 server_ids 一起使用时取交集。' },
        timeout_ms: { type: 'number', default: 3000, description: '单台超时时间（毫秒）。默认为3000（3秒）。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids as string[] | undefined;
    const tag = args.tag as string | undefined;

    // Get the target servers
    let servers = await listServers(db, tag, true);

    if (serverIds && serverIds.length > 0) {
      const idSet = new Set(serverIds);
      servers = servers.filter(s => idSet.has(s.id));
    }

    if (servers.length === 0) {
      return { content: [{ type: 'text', text: '没有找到要探测的服务器' }], isError: true };
    }

    // Run all probes concurrently
    const probeStart = Date.now();
    const probeResults = await Promise.all(
      servers.map(s => probeSingleServer(s.id, s.host, s.port))
    );
    const totalTimeMs = Date.now() - probeStart;

    // Batch-update server statuses (no need to await for response)
    const updatePromises = probeResults.map(r =>
      updateServerStatus(db, r.server_id, {
        online: r.reachable,
        ping_ms: r.latency_ms,
        error: r.error,
      }).catch(() => {}) // swallow per-update errors
    );
    await Promise.all(updatePromises);

    const online = probeResults.filter(r => r.reachable);
    const offline = probeResults.filter(r => !r.reachable);

    // Build a per-server result reference map
    const serverMap = new Map(servers.map(s => [s.id, s]));

    const detailedResults = probeResults.map(r => {
      const s = serverMap.get(r.server_id);
      return {
        server_id: r.server_id,
        name: s?.name ?? 'unknown',
        host: s?.host ?? 'unknown',
        port: s?.port ?? 22,
        reachable: r.reachable,
        latency_ms: r.latency_ms,
        error: r.error,
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: {
            total: servers.length,
            online: online.length,
            offline: offline.length,
            online_percent: servers.length > 0 ? Math.round((online.length / servers.length) * 100) : 0,
            total_time_ms: totalTimeMs,
          },
          online_servers: detailedResults.filter(r => r.reachable),
          offline_servers: detailedResults.filter(r => !r.reachable),
          all_results: detailedResults,
        }, null, 2),
      }],
    };
  },
};
