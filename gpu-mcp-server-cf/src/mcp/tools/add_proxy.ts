import type { McpTool } from './index';
import { createProxy } from '../../db/queries';

export const addProxyTool: McpTool = {
  definition: {
    name: 'add_proxy',
    description: '向代理池中添加一个新的代理节点。代理节点用于中转SSH连接至GPU服务器——当服务器在国内无法直接访问时，通过代理节点连接。支持 SOCKS5 和 HTTP 代理协议。返回新代理的UUID。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '代理节点名称。例如 "HK-Relay-1"、"JP-Proxy-01"。' },
        host: { type: 'string', description: '代理服务器地址。例如 "127.0.0.1" 或 "proxy.example.com"。' },
        port: { type: 'number', default: 1080, description: '代理端口。SOCKS5默认1080，HTTP默认8080。' },
        username: { type: 'string', description: '代理认证用户名（可选）。' },
        password: { type: 'string', description: '代理认证密码（可选）。' },
        location: { type: 'string', description: '代理节点地理位置。例如 "香港"、"日本"、"美国西海岸"。用于标识代理所在区域。' },
        protocol: { type: 'string', enum: ['socks5', 'http'], default: 'socks5', description: '代理协议类型："socks5"（SOCKS5代理，推荐）或 "http"（HTTP代理）。' },
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
