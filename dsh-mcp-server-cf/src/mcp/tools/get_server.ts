import type { McpTool } from './index';
import { getServerById, getReachability } from '../../db/queries';
import { dbServerToDetail } from '../../models/server';

export const getServerTool: McpTool = {
  definition: {
    name: 'get_server',
    description: '获取单个服务器的完整信息，含连接方式和可达代理',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: 'text', text: `Server not found: ${serverId}` }], isError: true };
    }
    const reachable = await getReachability(db, serverId);
    const detail = dbServerToDetail(server, reachable.map(r => ({
      id: r.proxy_id,
      name: r.proxy_name,
      latency_ms: r.latency_ms,
    })));
    return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
  },
};
