import type { McpTool } from './index';
import { listServers, queryServersByAbility, getReachability } from '../../db/queries';
import { renderConnectionMode } from '../../models/server';

export const batchQueryServersTool: McpTool = {
  definition: {
    name: 'batch_query_servers',
    description: '批量查询服务器，并为每台服务器附带连通性信息。用于分布式任务编排场景——当你需要一次拿到多台服务器的完整信息（含谁在使用、执行什么任务可达代理、连接方式、硬件规格），以便决定将哪些服务器分配给一个并行任务时使用。比 find_best_server 返回更多原始数据，且不排序推荐。每台服务器返回 task 字段显示当前占用情况和历史任务。',
    inputSchema: {
      type: 'object',
      properties: {
        server_ids: {
          type: 'array',
          items: { type: 'string' },
          description: '指定要查询的服务器ID列表。如果提供此字段则只返回这些服务器；不提供则返回所有服务器。ID 从 list_servers 获取。',
        },
        tag: { type: 'string', description: '按标签过滤。例如 "training" 只返回标注了 training 的服务器。与 server_ids 一起使用时取交集。' },
        gpu_model: { type: 'string', description: '只返回指定GPU型号的服务器。例如 "NVIDIA A100"。' },
        min_ram_gb: { type: 'number', description: '最低内存要求（GB）。' },
        min_cpu_cores: { type: 'number', description: '最低CPU核心数要求。' },
        min_disk_gb: { type: 'number', description: '最低磁盘空间要求（GB）。' },
        require_online: { type: 'boolean', default: true, description: '是否只返回在线服务器。默认为true。' },
        exclude_busy: { type: 'boolean', default: false, description: '是否排除正在被占用的服务器。设为 true 时只返回 current_agent 为 null 的空闲服务器。' },
        group_by_connectivity: { type: 'boolean', default: false, description: '是否按连接方式分组返回（direct 组和 proxy 组）。设为 true 时，结果会分成 direct_group 和 proxy_group 两组，方便 agent 判断哪些可以直连。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids as string[] | undefined;
    const tag = args.tag as string | undefined;
    const gpuModel = args.gpu_model as string | undefined;
    const minRamGb = args.min_ram_gb as number | undefined;
    const minCpuCores = args.min_cpu_cores as number | undefined;
    const minDiskGb = args.min_disk_gb as number | undefined;
    const requireOnline = args.require_online !== false;
    const excludeBusy = args.exclude_busy === true;
    const groupByConnectivity = args.group_by_connectivity === true;

    // Start with full server list
    let servers = await listServers(db, tag, true);

    // Filter by server_ids if provided
    if (serverIds && serverIds.length > 0) {
      const idSet = new Set(serverIds);
      servers = servers.filter(s => idSet.has(s.id));
    }

    // Filter by hardware specs
    if (gpuModel) {
      servers = servers.filter(s => s.gpu_model === gpuModel);
    }
    if (minRamGb !== undefined) {
      servers = servers.filter(s => s.ram_gb !== null && s.ram_gb >= minRamGb);
    }
    if (minCpuCores !== undefined) {
      servers = servers.filter(s => s.cpu_cores !== null && s.cpu_cores >= minCpuCores);
    }
    if (minDiskGb !== undefined) {
      servers = servers.filter(s => s.disk_gb !== null && s.disk_gb >= minDiskGb);
    }
    if (requireOnline) {
      servers = servers.filter(s => s.status_online === 1);
    }
    if (excludeBusy) {
      servers = servers.filter(s => s.current_agent === null);
    }

    // Enrich each server with reachability info (concurrent)
    const enriched = await Promise.all(servers.map(async (s) => {
      const reachable = await getReachability(db, s.id);
      const proxyConfig = {
        v2ray_available: s.v2ray_available === 1,
        direct_when_proxy_available: s.direct_when_proxy_available === 1,
        direct_when_no_proxy: s.direct_when_no_proxy === 1,
      };
      return {
        id: s.id,
        name: s.name,
        host: s.host,
        port: s.port,
        gpu_model: s.gpu_model,
        gpu_memory_gb: s.gpu_memory_gb,
        cpu_cores: s.cpu_cores,
        ram_gb: s.ram_gb,
        disk_gb: s.disk_gb,
        status_online: s.status_online === 1,
        status_ping_ms: s.status_ping_ms,
        status_error: s.status_error,
        connection_mode: proxyConfig,
        connection_mode_label: renderConnectionMode(proxyConfig),
        tags: s.tags ? JSON.parse(s.tags) : [],
        task: {
          current_task: s.current_task,
          current_agent: s.current_agent,
          task_started_at: s.task_started_at,
          is_busy: s.current_agent !== null,
        },
        reachable_proxies: reachable.map(r => ({
          proxy_id: r.proxy_id,
          proxy_name: r.proxy_name,
          reachable: r.reachable === 1,
          latency_ms: r.latency_ms,
        })),
      };
    }));

    // Group by connectivity if requested
    if (groupByConnectivity) {
      const directGroup = enriched.filter(s =>
        s.connection_mode.direct_when_no_proxy ||
        (s.connection_mode.v2ray_available && s.connection_mode.direct_when_proxy_available)
      );
      const proxyGroup = enriched.filter(s =>
        !s.connection_mode.direct_when_no_proxy &&
        !(s.connection_mode.v2ray_available && s.connection_mode.direct_when_proxy_available)
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            total: enriched.length,
            direct_group: {
              count: directGroup.length,
              servers: directGroup,
              description: '这些服务器可直连（无代理或V2RayN直连模式），适合低延迟场景',
            },
            proxy_group: {
              count: proxyGroup.length,
              servers: proxyGroup,
              description: '这些服务器需要通过代理池中转，适合非延迟敏感任务',
            },
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: enriched.length,
          servers: enriched,
        }, null, 2),
      }],
    };
  },
};
