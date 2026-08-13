import type { McpTool } from './index';
import { queryServersByAbility, getServerById, getReachability } from '../../db/queries';
import { renderConnectionMode, dbServerToDetail } from '../../models/server';

export const findBestServerTool: McpTool = {
  definition: {
    name: 'find_best_server',
    description: '根据任务需求自动推荐最佳GPU服务器。当你需要找一台最适合跑训练或推理任务的服务器时使用——传入任务要求（如GPU型号、最低内存、CPU核心数等），工具会自动筛选在线且满足条件的服务器，按资源大小排序并返回推荐列表。如果没有任何服务器满足全部条件，也会返回最接近的候选项。',
    inputSchema: {
      type: 'object',
      properties: {
        gpu_model: { type: 'string', description: '期望的GPU型号。例如 "NVIDIA A100"、"RTX 4090"。如果留空则不限制型号。' },
        min_gpu_memory_gb: { type: 'number', description: '最低显存要求（GB）。例如 24 表示需要至少24GB显存。' },
        min_ram_gb: { type: 'number', description: '最低内存要求（GB）。例如 128 表示至少128GB内存。' },
        min_cpu_cores: { type: 'number', description: '最低CPU核心数要求。例如 16。' },
        min_disk_gb: { type: 'number', description: '最低磁盘空间要求（GB）。例如 500。' },
        require_online: { type: 'boolean', default: true, description: '是否只返回在线服务器。默认为true。设为false则包括离线服务器。' },
        limit: { type: 'number', default: 5, description: '返回的最大推荐数量。默认为5。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const gpuModel = args.gpu_model as string | undefined;
    const minGpuMemoryGb = args.min_gpu_memory_gb as number | undefined;
    const minRamGb = args.min_ram_gb as number | undefined;
    const minCpuCores = args.min_cpu_cores as number | undefined;
    const minDiskGb = args.min_disk_gb as number | undefined;
    const requireOnline = args.require_online !== false;
    const limit = Math.min((args.limit as number) ?? 5, 20);

    // Query servers matching the requirements
    const servers = await queryServersByAbility(db, {
      gpu_model: gpuModel,
      min_ram_gb: minRamGb,
      min_cpu_cores: minCpuCores,
      min_disk_gb: minDiskGb,
      status_online: requireOnline ? true : undefined,
    });

    // Further filter by GPU memory (not in query, so filter in-memory)
    let filtered = servers;
    if (minGpuMemoryGb !== undefined) {
      filtered = servers.filter(s => s.gpu_memory_gb !== null && s.gpu_memory_gb >= minGpuMemoryGb);
    }

    // Sort: prefer more resources
    const scored = filtered.map(s => {
      let score = 0;
      if (s.gpu_memory_gb) score += s.gpu_memory_gb;
      if (s.ram_gb) score += s.ram_gb;
      if (s.cpu_cores) score += s.cpu_cores;
      return { server: s, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const topServers = scored.slice(0, limit);

    // Enrich with connection info
    const recommendations = await Promise.all(topServers.map(async ({ server, score }) => {
      const reachable = await getReachability(db, server.id);
      const detail = dbServerToDetail(server, reachable.map(r => ({
        id: r.proxy_id,
        name: r.proxy_name,
        latency_ms: r.latency_ms,
      })));
      return {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        gpu_model: server.gpu_model,
        gpu_memory_gb: server.gpu_memory_gb,
        cpu_cores: server.cpu_cores,
        ram_gb: server.ram_gb,
        disk_gb: server.disk_gb,
        status_online: server.status_online === 1,
        connection_mode_label: renderConnectionMode({
          v2ray_available: server.v2ray_available === 1,
          direct_when_proxy_available: server.direct_when_proxy_available === 1,
          direct_when_no_proxy: server.direct_when_no_proxy === 1,
        }),
        reachable_proxies: detail.reachable_proxies,
      };
    }));

    const summary = {
      total_matching: filtered.length,
      total_servers: servers.length,
      requirements: {
        gpu_model: gpuModel ?? 'any',
        min_gpu_memory_gb: minGpuMemoryGb ?? 'any',
        min_ram_gb: minRamGb ?? 'any',
        min_cpu_cores: minCpuCores ?? 'any',
        min_disk_gb: minDiskGb ?? 'any',
        require_online: requireOnline,
      },
      recommendations,
    };

    if (recommendations.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ 没有找到满足条件的服务器。\n\n要求：${JSON.stringify(summary.requirements, null, 2)}\n\n建议放宽筛选条件后重试。`,
        }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
};
