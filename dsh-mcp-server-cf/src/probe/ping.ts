// Cloudflare Workers TCP sockets - must be imported from this module
import { connect } from 'cloudflare:sockets';

export interface PingResult {
  reachable: boolean;
  latency_ms: number | null;
  error?: string;
}

/**
 * TCP ping: attempt to establish a TCP connection to host:port.
 * Uses Cloudflare Workers connect() API.
 */
export async function tcpPing(
  host: string,
  port: number,
  timeoutMs = 3000
): Promise<PingResult> {
  const startTime = Date.now();
  try {
    const socket = connect({ hostname: host, port });
    await socket.opened;
    const latencyMs = Date.now() - startTime;
    (socket as any).close();
    return { reachable: true, latency_ms: latencyMs };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return { reachable: false, latency_ms: elapsed, error: `TCP ping failed: ${err}` };
  }
}
