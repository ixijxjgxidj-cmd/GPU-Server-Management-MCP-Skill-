import type { McpTool } from './index';
import { queryServersByAbility } from '../../db/queries';

export const queryServersTool: McpTool = {
  definition: {
    name: 'query_servers_by_ability',
    description: '按能力查询服务器',
    inputSchema: {
      type: 'object',
      properties: {
        gpu_model: { type: 'string' },
        min_ram_gb: { type: 'number' },
        min_cpu_cores: { type: 'number' },
        min_disk_gb: { type: 'number' },
        status_online: { type: 'boolean' },
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
    return { content: [{ type: 'text', text: JSON.stringify(servers, null, 2) }] };
  },
};
