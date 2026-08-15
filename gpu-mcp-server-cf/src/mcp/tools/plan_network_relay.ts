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
    const reachMap = new Map(reachRows.map(r => [r.proxy_id, r]));
    const proxies = await listProxies(db);
    
    // Filter active proxies and associate latency if available
    const activeProxies = proxies.filter(p => p.is_alive !== 0);
    const reachableProxies: ReachableProxy[] = activeProxies.map(p => {
      const r = reachMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        host: p.host,
        port: p.port,
        protocol: p.protocol,
        latency_ms: r?.latency_ms ?? null,
        region: p.region ?? null,
        target_scores: p.target_scores ?? null,
      };
    });
    const result = planRelay(target, resourceUrl, reachableProxies, all);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
};
