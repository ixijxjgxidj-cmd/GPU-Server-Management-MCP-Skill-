import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { streamSSE } from 'hono/streaming';
import { tcpPing } from '../probe/ping';
import { testViaSocks5 } from '../probe/socks5';
import { listProxies, upsertReachability } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const body = await c.req.json();
  const { host, port = 22, server_id, connection_type = 'standard' } = body;
  const isTunnel = connection_type === 'cloudflare_tunnel';

  return streamSSE(c, async (stream) => {
    // Step 0: DNS resolution (always useful, especially for tunnel hostnames)
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({ step: 'dns', status: 'running' }) });
    const dnsResult = await resolveDNS(host);
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({
      step: 'dns', status: dnsResult.resolved ? 'success' : 'failed',
      ip: dnsResult.ip, error: dnsResult.error,
    }) });

    // Step 1: Direct TCP ping on the given port (works for both standard SSH and CF tunnel hostnames)
    const stepLabel = isTunnel ? '隧道端口' : '直连SSH';
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({ step: 'direct_ssh', status: 'running' }) });
    const pingResult = await tcpPing(host, port);
    await stream.writeSSE({ event: 'verify', data: JSON.stringify({
      step: 'direct_ssh', status: pingResult.reachable ? 'success' : 'failed',
      latency_ms: pingResult.latency_ms, error: pingResult.error,
      step_label: stepLabel,
    }) });

    // Step 2: For standard servers—test through each proxy. For tunnel servers—skip (irrelevant).
    const proxyResults: Array<{ proxy_id: string; name: string; reachable: boolean; latency_ms: number | null; error?: string }> = [];

    if (isTunnel) {
      await stream.writeSSE({ event: 'verify', data: JSON.stringify({
        step: 'proxy_ssh', proxy_id: '', proxy_name: '代理', status: 'skipped',
        skip_reason: 'Cloudflare隧道不依赖代理',
      }) });
    } else {
      const proxies = await listProxies(c.env.DB);
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

        if (result.reachable && server_id) {
          await upsertReachability(c.env.DB, proxy.id, server_id, true, result.latency_ms);
        }
      }
    }

    // Step 3: Complete
    const bestProxy = proxyResults
      .filter(r => r.reachable)
      .sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];

    await stream.writeSSE({ event: 'verify', data: JSON.stringify({ step: 'complete', best_proxy: bestProxy || null }) });
  });
});

/**
 * Simple DNS resolution via a Cloudflare DNS-over-HTTPS lookup.
 * Returns { resolved: boolean, ip?: string, error?: string }.
 */
async function resolveDNS(host: string): Promise<{ resolved: boolean; ip?: string; error?: string }> {
  try {
    const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return { resolved: false, error: `DNS server ${resp.status}` };
    const data = await resp.json() as { Answer?: Array<{ type: number; data: string }> };
    const aRecords = (data.Answer || []).filter(r => r.type === 1).map(r => r.data);
    if (aRecords.length > 0) return { resolved: true, ip: aRecords[0] };
    return { resolved: false, error: 'no A records' };
  } catch (e) {
    return { resolved: false, error: `${e}`.slice(0, 100) };
  }
}

export default app;
