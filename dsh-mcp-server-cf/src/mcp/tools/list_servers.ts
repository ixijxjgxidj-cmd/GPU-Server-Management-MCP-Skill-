import type { McpTool } from './index';
import { listServers } from '../../db/queries';
import { renderConnectionMode } from '../../models/server';

export const listServersTool: McpTool = {
  definition: {
    name: 'list_servers',
    description: '列出所有服务器，可选按标签过滤',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: '按标签过滤' },
      },
    },
  },
  execute: async (args, { db }) => {
    const tag = args.tag as string | undefined;
    const servers = await listServers(db, tag);
    const summaries = servers.map(s => ({
      id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      gpu_model: s.gpu_model,
      status_online: s.status_online === 1,
      connection_mode_label: renderConnectionMode({
        v2ray_available: s.v2ray_available === 1,
        direct_when_proxy_available: s.direct_when_proxy_available === 1,
        direct_when_no_proxy: s.direct_when_no_proxy === 1,
      }),
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }],
    };
  },
};
