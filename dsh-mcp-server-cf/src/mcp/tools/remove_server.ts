import type { McpTool } from './index';
import { deleteServer } from '../../db/queries';

export const removeServerTool: McpTool = {
  definition: {
    name: 'remove_server',
    description: '删除服务器',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const success = await deleteServer(db, args.server_id as string);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
