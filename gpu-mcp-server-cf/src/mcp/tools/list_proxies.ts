import type { McpTool } from './index';
import { listProxies } from '../../db/queries';
import { dbProxyToNode } from '../../models/proxy';

export const listProxiesTool: McpTool = {
  definition: {
    name: 'list_proxies',
    description: '列出代理池中的所有代理节点。当你需要了解有哪些 SOCKS5/HTTP 代理可用、查看代理的地址和位置时使用。返回每个代理的ID、名称、协议类型、地址端口和位置信息。代理ID在添加服务器时可用于设置 default_proxy_id，或在测试连通性时指定。',
    inputSchema: { type: 'object', properties: {} },
  },
  execute: async (_, { db }) => {
    const proxies = await listProxies(db);
    const nodes = proxies.map(dbProxyToNode);
    return { content: [{ type: 'text', text: JSON.stringify(nodes, null, 2) }] };
  },
};
