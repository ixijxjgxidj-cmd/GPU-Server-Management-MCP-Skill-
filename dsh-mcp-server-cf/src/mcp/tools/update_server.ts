import type { McpTool } from './index';
import { updateServer } from '../../db/queries';

export const updateServerTool: McpTool = {
  definition: {
    name: 'update_server',
    description: '更新服务器字段。传入 updates 对象，只改传入的字段。可用字段：name, host, port, username, auth_method, key_path, key_content(明文), password, vendor_url, v2ray_available, direct_when_proxy_available, direct_when_no_proxy, gpu_model, gpu_memory_gb, cpu_cores, ram_gb, disk_gb, default_proxy_id, tags, notes, enabled(1显示/0隐藏)。也用于保存SSH检测到的硬件信息或临时上下架服务器。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID（来自 get_servers）。' },
        updates: {
          type: 'object',
          description: '要更新的字段集合，只传需要修改的。',
          properties: {
            name: { type: 'string' },
            host: { type: 'string' },
            port: { type: 'number' },
            username: { type: 'string' },
            auth_method: { type: 'string', enum: ['key', 'password'] },
            key_content: { type: 'string', description: 'SSH私钥明文（服务端原样存储）。' },
            gpu_model: { type: 'string' },
            gpu_memory_gb: { type: 'number' },
            cpu_cores: { type: 'number' },
            ram_gb: { type: 'number' },
            disk_gb: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' } },
            enabled: { type: 'number', enum: [0, 1], description: '1=显示给MCP，0=隐藏。' },
          },
        },
      },
      required: ['server_id', 'updates'],
    },
  },
  execute: async (args, { db }) => {
    const updates = { ...(args.updates as Record<string, unknown>) };
    // tags array → JSON string for storage
    if (Array.isArray(updates.tags)) updates.tags = JSON.stringify(updates.tags);
    const success = await updateServer(db, args.server_id as string, updates);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
