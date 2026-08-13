import type { McpTool } from './index';
import { listProxies } from '../../db/queries';
import { dbProxyToNode } from '../../models/proxy';

export const listProxiesTool: McpTool = {
  definition: {
    name: 'list_proxies',
    description: '列出代理池中所有代理节点',
    inputSchema: { type: 'object', properties: {} },
  },
  execute: async (_, { db }) => {
    const proxies = await listProxies(db);
    const nodes = proxies.map(dbProxyToNode);
    return { content: [{ type: 'text', text: JSON.stringify(nodes, null, 2) }] };
  },
};
