import type { McpTool } from './index';
import { updateServer } from '../../db/queries';

export const updateServerTool: McpTool = {
  definition: {
    name: 'update_server',
    description: '更新服务器的部分字段。用于修改服务器名称、地址、端口、硬件信息、连接配置等。server_id 从 list_servers 获取。注意：auth_method 切换时需要同时提供对应的凭据字段。不能修改 id 和 created_at。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID——从 list_servers 返回的 id 字段获取。' },
        updates: {
          type: 'object',
          description: '要更新的字段集合。只需传入需要修改的字段，未传入的字段保持不变。可用字段：name, host, port, username, auth_method, key_path, key_content, password, vendor_url, v2ray_available, direct_when_proxy_available, direct_when_no_proxy, gpu_model, gpu_memory_gb, cpu_cores, ram_gb, disk_gb, default_proxy_id, tags。',
          properties: {
            name: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            username: { type: 'string' },
            auth_method: { type: 'string', enum: ['key', 'password'] },
            gpu_model: { type: 'string' },
            cpu_cores: { type: 'number' },
            ram_gb: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      required: ['server_id', 'updates'],
    },
  },
  execute: async (args, { db }) => {
    const success = await updateServer(db, args.server_id as string, args.updates as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
