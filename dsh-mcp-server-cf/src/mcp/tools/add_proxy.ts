import type { McpTool } from './index';
import { createProxy } from '../../db/queries';

export const addProxyTool: McpTool = {
  definition: {
    name: 'add_proxy',
    description: '添加代理节点到代理池',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        host: { type: 'string' },
        port: { type: 'number', default: 1080 },
        username: { type: 'string' },
        password: { type: 'string' },
        location: { type: 'string' },
        protocol: { type: 'string', enum: ['socks5', 'http'], default: 'socks5' },
      },
      required: ['name', 'host'],
    },
  },
  execute: async (args, { db }) => {
    const id = await createProxy(db, {
      name: args.name as string,
      host: args.host as string,
      port: (args.port as number) ?? 1080,
      username: (args.username as string) ?? null,
      password: (args.password as string) ?? null,
      location: (args.location as string) ?? null,
      protocol: (args.protocol as 'socks5' | 'http') ?? 'socks5',
    });
    return { content: [{ type: 'text', text: JSON.stringify({ id }) }] };
  },
};
