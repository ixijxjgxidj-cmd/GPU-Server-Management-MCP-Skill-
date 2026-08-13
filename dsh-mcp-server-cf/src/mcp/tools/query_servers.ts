import type { McpTool } from './index';
import { queryServersByAbility } from '../../db/queries';
import { renderConnectionMode } from '../../models/server';

export const queryServersTool: McpTool = {
  definition: {
    name: 'query_servers_by_ability',
    description: '按硬件能力筛选服务器。当需要找一台满足特定GPU型号、最低内存/CPU/磁盘要求的服务器时使用。不传任何参数则返回所有服务器。比 list_servers 更精确——可以指定最低配置要求。筛选结果按创建时间倒序排列。',
    inputSchema: {
      type: 'object',
      properties: {
        gpu_model: { type: 'string', description: '精确匹配GPU型号。例如 "NVIDIA A100"、"RTX 4090"。留空则不限型号。' },
        min_ram_gb: { type: 'number', description: '最低内存要求（GB）。例如 128 表示至少128GB内存。' },
        min_cpu_cores: { type: 'number', description: '最低CPU核心数要求。例如 16 表示至少16核。' },
        min_disk_gb: { type: 'number', description: '最低磁盘空间要求（GB）。' },
        status_online: { type: 'boolean', description: '是否只返回在线服务器。true=只返回在线，false=只返回离线，不传=返回全部状态。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const servers = await queryServersByAbility(db, {
      gpu_model: args.gpu_model as string | undefined,
      min_ram_gb: args.min_ram_gb as number | undefined,
      min_cpu_cores: args.min_cpu_cores as number | undefined,
      min_disk_gb: args.min_disk_gb as number | undefined,
      status_online: args.status_online as boolean | undefined,
    });
    const summaries = servers.map(s => ({
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
      connection_mode_label: renderConnectionMode({
        v2ray_available: s.v2ray_available === 1,
        direct_when_proxy_available: s.direct_when_proxy_available === 1,
        direct_when_no_proxy: s.direct_when_no_proxy === 1,
      }),
    }));
    return { content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }] };
  },
};
