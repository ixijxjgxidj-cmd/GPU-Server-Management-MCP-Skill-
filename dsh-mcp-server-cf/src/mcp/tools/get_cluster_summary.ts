import type { McpTool } from './index';
import { listServers, listProxies } from '../../db/queries';

export const getClusterSummaryTool: McpTool = {
  definition: {
    name: 'get_cluster_summary',
    description: '获取整个服务器集群的概览统计信息。当你想快速了解集群状况时使用——比如想知道有多少台服务器在线/离线、总GPU数量和显存、各GPU型号分布等。比 list_servers 更侧重于统计汇总而非单个服务器详情。不返回具体的服务器ID列表，只返回聚合数据。',
    inputSchema: {
      type: 'object',
      properties: {
        include_servers: { type: 'boolean', default: false, description: '是否在结果中包含服务器明细列表。设为true则同时返回每台服务器的简要信息。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const servers = await listServers(db, undefined, true);
    const proxies = await listProxies(db);
    const includeServers = args.include_servers === true;

    const total = servers.length;
    const online = servers.filter(s => s.status_online === 1).length;
    const offline = total - online;

    // GPU stats
    const gpuModels: Record<string, number> = {};
    let totalGpuMemory = 0;
    let totalRam = 0;
    let totalCpuCores = 0;

    for (const s of servers) {
      if (s.gpu_model) {
        gpuModels[s.gpu_model] = (gpuModels[s.gpu_model] || 0) + 1;
      }
      if (s.gpu_memory_gb) totalGpuMemory += s.gpu_memory_gb;
      if (s.ram_gb) totalRam += s.ram_gb;
      if (s.cpu_cores) totalCpuCores += s.cpu_cores;
    }

    // Proxy stats
    const proxyLocations: Record<string, number> = {};
    for (const p of proxies) {
      const loc = p.location || 'Unknown';
      proxyLocations[loc] = (proxyLocations[loc] || 0) + 1;
    }

    const summary: Record<string, unknown> = {
      servers: {
        total,
        online,
        offline,
        online_percent: total > 0 ? Math.round((online / total) * 100) : 0,
      },
      hardware: {
        gpu_models: gpuModels,
        total_gpu_memory_gb: totalGpuMemory,
        total_ram_gb: totalRam,
        total_cpu_cores: totalCpuCores,
      },
      proxies: {
        total: proxies.length,
        by_location: proxyLocations,
      },
    };

    if (includeServers) {
      summary.server_list = servers.map(s => ({
        id: s.id,
        name: s.name,
        host: s.host,
        gpu_model: s.gpu_model,
        status_online: s.status_online === 1,
        ping_ms: s.status_ping_ms,
      }));
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
};
