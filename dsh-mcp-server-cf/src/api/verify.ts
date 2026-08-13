import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { streamSSE } from 'hono/streaming';
import { tcpPing } from '../probe/ping';
import { testViaSocks5 } from '../probe/socks5';
import { listProxies, upsertReachability } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const body = await c.req.json();
  const { host, port = 22 } = body;

  return streamSSE(c, async (stream) => {
    // Step 1: Direct TCP ping (SSH port)
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({ step: 'direct_ssh', status: 'running' }) });
    const pingResult = await tcpPing(host, port);
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({
      step: 'direct_ssh', status: pingResult.reachable ? 'success' : 'failed',
      latency_ms: pingResult.latency_ms, error: pingResult.error,
    }) });

    // Step 2: Test through each proxy in pool
    const proxies = await listProxies(c.env.DB);
    const proxyResults: Array<{ proxy_id: string; name: string; reachable: boolean; latency_ms: number | null; error?: string }> = [];

    for (const proxy of proxies) {
      await stream.writeSSE({ event: 'verify', data: JSON.stringify({
        step: 'proxy_ssh', proxy_id: proxy.id, proxy_name: proxy.name, status: 'running',
      }) });

      let result: { reachable: boolean; latency_ms: number | null; error?: string };
      if (proxy.protocol === 'socks5') {
        result = await testViaSocks5(
          proxy.host, proxy.port, host, port,
          proxy.username ?? undefined, proxy.password ?? undefined
        );
      } else {
        result = await tcpPing(host, port);
      }

      proxyResults.push({ proxy_id: proxy.id, name: proxy.name, ...result });
      await stream.writeSSE({ event: 'verify', data: JSON.stringify({
        step: 'proxy_ssh', proxy_id: proxy.id, proxy_name: proxy.name,
        status: result.reachable ? 'success' : 'failed',
        latency_ms: result.latency_ms, error: result.error,
      }) });

      // Cache reachability
      if (result.reachable) {
        await upsertReachability(c.env.DB, proxy.id, '', true, result.latency_ms);
      }
    }

    // Step 3: Complete - recommend best proxy
    const bestProxy = proxyResults
      .filter(r => r.reachable)
      .sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];

    await stream.writeSSE({ event: 'verify', data: JSON.stringify({
      step: 'complete',
      best_proxy: bestProxy ? { id: bestProxy.proxy_id, name: bestProxy.name, latency_ms: bestProxy.latency_ms } : null,
    }) });
  });
});

export default app;
