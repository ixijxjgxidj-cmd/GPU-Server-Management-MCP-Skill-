import type { McpTool } from './index';
import { deleteServer } from '../../db/queries';

export const removeServerTool: McpTool = {
  definition: {
    name: 'remove_server',
    description: '从集群中删除一台服务器。此操作不可逆，会永久删除服务器记录及所有的可达性缓存数据。删除前请先确认用户意图。server_id 从 list_servers 获取。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '要删除的服务器ID——从 list_servers 返回的 id 字段获取。格式为 UUID。' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const success = await deleteServer(db, args.server_id as string);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
