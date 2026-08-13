import type { McpTool } from './index';
import { getServerById, getProxyById, upsertReachability } from '../../db/queries';
import { testViaSocks5 } from '../../probe/socks5';
import { tcpPing } from '../../probe/ping';

export const testProxyTool: McpTool = {
  definition: {
    name: 'test_proxy_for_server',
    description: '测试指定代理节点到指定GPU服务器的SSH端口连通性和延迟。当你怀疑某个代理无法到达服务器、或者想比较不同代理的延迟来选择最优代理时使用。结果会自动缓存到数据库中。服务器端口的可达性缓存会被后续的 get_server 返回的 reachable_proxies 使用。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '目标服务器ID——从 list_servers 返回的 id 字段获取。' },
        proxy_id: { type: 'string', description: '代理节点ID——从 list_proxies 返回的 id 字段获取。' },
      },
      required: ['server_id', 'proxy_id'],
    },
  },
  execute: async (args, { db }) => {
    const server = await getServerById(db, args.server_id as string);
    if (!server) {
      return { content: [{ type: 'text', text: 'Server not found' }], isError: true };
    }
    const proxy = await getProxyById(db, args.proxy_id as string);
    if (!proxy) {
      return { content: [{ type: 'text', text: 'Proxy not found' }], isError: true };
    }

    let result: { reachable: boolean; latency_ms: number | null; error?: string };

    if (proxy.protocol === 'socks5') {
      result = await testViaSocks5(
        proxy.host, proxy.port, server.host, server.port,
        proxy.username ?? undefined, proxy.password ?? undefined
      );
    } else {
      // HTTP proxy: use TCP ping directly (simplified)
      result = await tcpPing(server.host, server.port);
    }

    // Cache result
    await upsertReachability(db, proxy.id, server.id, result.reachable, result.latency_ms);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
};
