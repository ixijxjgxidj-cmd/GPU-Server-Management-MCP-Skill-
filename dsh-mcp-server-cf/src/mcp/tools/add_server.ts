import type { McpTool } from './index';
import { createServer } from '../../db/queries';

export const addServerTool: McpTool = {
  definition: {
    name: 'add_server',
    description: '添加新服务器',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        host: { type: 'string' },
        port: { type: 'number', default: 22 },
        username: { type: 'string' },
        auth_method: { type: 'string', enum: ['key', 'password'] },
        key_path: { type: 'string' },
        key_content: { type: 'string' },
        password: { type: 'string' },
        v2ray_available: { type: 'boolean', default: false },
        direct_when_proxy_available: { type: 'boolean', default: false },
        direct_when_no_proxy: { type: 'boolean', default: false },
        gpu_model: { type: 'string' },
        gpu_memory_gb: { type: 'number' },
        cpu_cores: { type: 'number' },
        ram_gb: { type: 'number' },
        disk_gb: { type: 'number' },
        default_proxy_id: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'host', 'username', 'auth_method'],
    },
  },
  execute: async (args, { db }) => {
    const id = await createServer(db, {
      name: args.name as string,
      vendor_url: (args.vendor_url as string) ?? null,
      host: args.host as string,
      port: (args.port as number) ?? 22,
      username: args.username as string,
      auth_method: (args.auth_method as 'key' | 'password'),
      key_path: (args.key_path as string) ?? null,
      key_content: (args.key_content as string) ?? null,
      password: (args.password as string) ?? null,
      v2ray_available: (args.v2ray_available as boolean) ? 1 : 0,
      direct_when_proxy_available: (args.direct_when_proxy_available as boolean) ? 1 : 0,
      direct_when_no_proxy: (args.direct_when_no_proxy as boolean) ? 1 : 0,
      gpu_model: (args.gpu_model as string) ?? null,
      gpu_memory_gb: (args.gpu_memory_gb as number) ?? null,
      cpu_cores: (args.cpu_cores as number) ?? null,
      ram_gb: (args.ram_gb as number) ?? null,
      disk_gb: (args.disk_gb as number) ?? null,
      default_proxy_id: (args.default_proxy_id as string) ?? null,
      tags: args.tags ? JSON.stringify(args.tags) : null,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ id }) }] };
  },
};
