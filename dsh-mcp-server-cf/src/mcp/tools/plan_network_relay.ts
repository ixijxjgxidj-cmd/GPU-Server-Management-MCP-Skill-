import type { McpTool } from './index';
import { queryServersByAbility, listProxies, getReachability } from '../../db/queries';
import { planRelay } from '../../orchestration/network';
import type { ReachableProxy } from '../../orchestration/network';

export const planNetworkRelayTool: McpTool = {
  definition: {
    name: 'plan_network_relay',
    description: '给一台网络慢/不通的服务器拿到资源的最佳方案:有可达代理→返回代理加速命令(http_proxy/proxychains/git/wget/pip全形态);完全不通但有通畅机器→返回跳板中转命令;两者都可行都返回。',
    inputSchema: {
      type: 'object',
      properties: {
        target_server_id: { type: 'string', description: '目标机ID(来自get_servers)。' },
        resource_url: { type: 'string', description: '要下载的资源URL。' },
      },
      required: ['target_server_id', 'resource_url'],
    },
  },
  execute: async (args, { db }) => {
    const targetId = args.target_server_id as string;
    const resourceUrl = args.resource_url as string;
    const all = await queryServersByAbility(db, { status_online: true });
    const target = all.find(s => s.id === targetId);
    if (!target) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'target server not found' }) }], isError: true };
    }
    const reachRows = await getReachability(db, target.id);
    const proxies = await listProxies(db);
    const proxyById = new Map(proxies.map(p => [p.id, p]));
    const reachableProxies: ReachableProxy[] = reachRows
      .filter(r => r.reachable === 1)
      .map(r => {
        const p = proxyById.get(r.proxy_id);
        return { id: r.proxy_id, name: r.proxy_name, host: p?.host ?? '', port: p?.port ?? 0, protocol: p?.protocol ?? 'socks5', latency_ms: r.latency_ms };
      });
    const result = planRelay(target, resourceUrl, reachableProxies, all);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
