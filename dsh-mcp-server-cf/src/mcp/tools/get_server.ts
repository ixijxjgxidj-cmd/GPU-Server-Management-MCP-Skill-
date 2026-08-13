import type { McpTool } from './index';
import { getServerById, getReachability } from '../../db/queries';
import { dbServerToDetail } from '../../models/server';

export const getServerTool: McpTool = {
  definition: {
    name: 'get_server',
    description: '获取单个服务器的完整详细信息。当 list_servers 返回的信息不够详细时使用——比如需要查看认证方式、硬件资源(CPU/内存/磁盘)、连接配置(V2RayN/直连策略)、以及哪些代理可以到达该服务器(reachable_proxies)时。server_id 从 list_servers 的返回中获取。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID——从 list_servers 返回的 id 字段获取。格式为 UUID。' },
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
