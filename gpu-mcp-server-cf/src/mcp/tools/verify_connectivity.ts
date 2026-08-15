import type { McpTool } from './index';
import { getServerById, listProxies, upsertReachability, updateServerStatus, updateServer } from '../../db/queries';
import { tcpPing } from '../../probe/ping';
import { testViaSocks5 } from '../../probe/socks5';

export const verifyConnectivityTool: McpTool = {
  definition: {
    name: 'verify_server_connectivity',
    description: '对指定服务器执行全面的连通性测试：1) 直连SSH端口探测；2) 通过每个代理测试SSH连接。结果自动更新在线状态并缓存每个代理的可达性(供 get_servers 返回)。服务器需先经 upsert_server 登记。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '要测试的服务器ID——从 list_servers 返回的 id 字段获取。' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: 'text', text: `服务器未找到: ${serverId}` }], isError: true };
    }

    const results: Record<string, unknown>[] = [];

    // Step 1: Direct TCP ping
    const directPing = await tcpPing(server.host, server.port);
    results.push({
      type: 'direct',
      reachable: directPing.reachable,
      latency_ms: directPing.latency_ms,
      error: directPing.error,
    });

    // Update server online status based on direct ping
    if (directPing.reachable) {
      await updateServerStatus(db, serverId, {
        online: true,
        ping_ms: directPing.latency_ms,
        error: undefined,
      });
    }

    // Step 2: Test through each proxy
    const proxies = await listProxies(db);
    const proxyResults: Array<{
      proxy_id: string;
      proxy_name: string;
      reachable: boolean;
      latency_ms: number | null;
      error?: string;
    }> = [];

    for (const proxy of proxies) {
      let result: { reachable: boolean; latency_ms: number | null; error?: string };
      if (proxy.protocol === 'socks5') {
        result = await testViaSocks5(
          proxy.host, proxy.port, server.host, server.port,
          proxy.username ?? undefined, proxy.password ?? undefined
        );
      } else {
        result = await tcpPing(server.host, server.port);
      }

      proxyResults.push({
        proxy_id: proxy.id,
        proxy_name: proxy.name,
        ...result,
      });

      // Cache result
      await upsertReachability(db, proxy.id, serverId, result.reachable, result.latency_ms);
    }

    results.push({
      type: 'proxy_tests',
      proxies_tested: proxies.length,
      reachable_count: proxyResults.filter(r => r.reachable).length,
      proxy_results: proxyResults,
    });

    // Determine best proxy
    const bestProxy = proxyResults
      .filter(r => r.reachable)
      .sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];

    // Overall verdict
    const directOk = directPing.reachable;
    const anyProxyOk = proxyResults.some(r => r.reachable);

    let verdict: string;
    if (directOk && anyProxyOk) {
      verdict = `✅ 服务器 ${server.name} 直连可达，且有 ${proxyResults.filter(r => r.reachable).length} 个代理可到达`;
    } else if (directOk) {
      verdict = `✅ 服务器 ${server.name} 直连可达，但所有代理均无法到达`;
    } else if (anyProxyOk) {
      verdict = `⚠️ 服务器 ${server.name} 直连不可达，但有 ${proxyResults.filter(r => r.reachable).length} 个代理可用`;
    } else {
      verdict = `❌ 服务器 ${server.name} 直连和所有代理均不可达`;
    }

    results.push({
      type: 'verdict',
      direct_reachable: directOk,
      any_proxy_reachable: anyProxyOk,
      best_proxy: bestProxy ? { proxy_id: bestProxy.proxy_id, name: bestProxy.proxy_name, latency_ms: bestProxy.latency_ms } : null,
      message: verdict,
    });

    // Auto-update server connection mode flags in DB
    if (directOk && anyProxyOk) {
      await updateServer(db, serverId, {
        v2ray_available: 1,
        direct_when_no_proxy: 1,
        direct_when_proxy_available: 1,
      });
    } else if (directOk) {
      await updateServer(db, serverId, {
        v2ray_available: 0,
        direct_when_no_proxy: 1,
        direct_when_proxy_available: 1,
      });
    } else if (anyProxyOk) {
      await updateServer(db, serverId, {
        v2ray_available: 1,
        direct_when_no_proxy: 0,
        direct_when_proxy_available: 0,
      });
    }

    // If direct ping failed but proxies work, server is "reachable through proxy"
    if (!directOk && anyProxyOk) {
      await updateServerStatus(db, serverId, {
        online: true,
        ping_ms: bestProxy?.latency_ms ?? null,
        error: 'Direct unreachable, reachable via proxy',
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ server_id: serverId, server_name: server.name, results }, null, 2),
      }],
    };
  },
};
