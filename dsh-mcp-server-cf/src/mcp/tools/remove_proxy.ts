import type { McpTool } from './index';
import { deleteProxy } from '../../db/queries';

export const removeProxyTool: McpTool = {
  definition: {
    name: 'remove_proxy',
    description: '删除代理节点',
    inputSchema: {
      type: 'object',
      properties: {
        proxy_id: { type: 'string' },
      },
      required: ['proxy_id'],
    },
  },
  execute: async (args, { db }) => {
    const success = await deleteProxy(db, args.proxy_id as string);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
