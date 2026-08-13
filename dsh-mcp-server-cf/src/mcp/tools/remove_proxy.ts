import type { McpTool } from './index';
import { deleteProxy } from '../../db/queries';

export const removeProxyTool: McpTool = {
  definition: {
    name: 'remove_proxy',
    description: '从代理池中删除一个代理节点。此操作不可逆。如果该代理被设置为某服务器的 default_proxy_id，删除后服务器将使用自动选择逻辑。proxy_id 从 list_proxies 获取。',
    inputSchema: {
      type: 'object',
      properties: {
        proxy_id: { type: 'string', description: '要删除的代理节点ID——从 list_proxies 返回的 id 字段获取。' },
      },
      required: ['proxy_id'],
    },
  },
  execute: async (args, { db }) => {
    const success = await deleteProxy(db, args.proxy_id as string);
    return { content: [{ type: 'text', text: JSON.stringify({ success }) }] };
  },
};
