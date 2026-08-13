import type { McpTool } from './index';
import { updateServer } from '../../db/queries';

export const updateServerTool: McpTool = {
  definition: {
    name: 'update_server',
    description: '更新服务器部分字段',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['server_id', 'updates'],
    },
  },
  execute: async (args, { db }) => {
    const success = await updateServer(db, args.server_id as string, args.updates as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
