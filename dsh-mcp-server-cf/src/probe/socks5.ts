export interface Socks5Result {
  reachable: boolean;
  latency_ms: number | null;
  error?: string;
}

/**
 * Test connectivity to targetHost:targetPort via a SOCKS5 proxy.
 * Uses Cloudflare Workers connect() API for raw TCP.
 */
export async function testViaSocks5(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPort: number,
  username?: string,
  password?: string,
  timeoutMs = 5000
): Promise<Socks5Result> {
  const startTime = Date.now();

  try {
    // connect() is a global in Cloudflare Workers runtime
    const socket: any = await (globalThis as any).connect({ hostname: proxyHost, port: proxyPort });
    await socket.opened;
    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();

    // SOCKS5 greeting
    let authBytes: Uint8Array;
    if (username) {
      authBytes = new Uint8Array([0x05, 0x02, 0x00, 0x02]); // no auth + user/pass
    } else {
      authBytes = new Uint8Array([0x05, 0x01, 0x00]); // no auth
    }
    await writer.write(authBytes);

    // Read greeting response
    const greetResp = await readWithTimeout(reader, 2, timeoutMs);
    if (!greetResp || greetResp[0] !== 0x05) {
      return { reachable: false, latency_ms: null, error: 'SOCKS5: invalid greeting response' };
    }

    // Handle auth if required
    if (greetResp[1] === 0x02 && username) {
      const passBytes = buildUserPassAuth(username, password ?? '');
      await writer.write(passBytes);
      const authResp = await readWithTimeout(reader, 2, timeoutMs);
      if (!authResp || authResp[0] !== 0x01 || authResp[1] !== 0x00) {
        return { reachable: false, latency_ms: null, error: 'SOCKS5: auth failed' };
      }
    } else if (greetResp[1] === 0xff) {
      return { reachable: false, latency_ms: null, error: 'SOCKS5: no acceptable auth method' };
    }

    // Connect request
    const connectBytes = buildConnectRequest(targetHost, targetPort);
    await writer.write(connectBytes);

    // Read connect response
    const connectResp = await readWithTimeout(reader, 10, timeoutMs);
    if (!connectResp || connectResp[0] !== 0x05 || connectResp[1] !== 0x00) {
      const errorCode = connectResp ? connectResp[1].toString(16) : 'unknown';
      return { reachable: false, latency_ms: null, error: `SOCKS5: connect failed (0x${errorCode})` };
    }

    const latencyMs = Date.now() - startTime;
    writer.releaseLock();
    reader.releaseLock();
    socket.close();
    return { reachable: true, latency_ms: latencyMs };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return { reachable: false, latency_ms: elapsed, error: `Connection failed: ${err}` };
  }
}

function buildUserPassAuth(username: string, password: string): Uint8Array {
  const u = new TextEncoder().encode(username);
  const p = new TextEncoder().encode(password);
  const buf = new Uint8Array(3 + u.length + p.length);
  buf[0] = 0x01;
  buf[1] = u.length;
  buf.set(u, 2);
  buf[2 + u.length] = p.length;
  buf.set(p, 3 + u.length);
  return buf;
}

function buildConnectRequest(host: string, port: number): Uint8Array {
  const hostBytes = new TextEncoder().encode(host);
  const buf = new Uint8Array(4 + 1 + hostBytes.length + 2);
  buf[0] = 0x05;
  buf[1] = 0x01;
  buf[2] = 0x00;
  buf[3] = 0x03;
  buf[4] = hostBytes.length;
  buf.set(hostBytes, 5);
  buf[5 + hostBytes.length] = (port >> 8) & 0xff;
  buf[6 + hostBytes.length] = port & 0xff;
  return buf;
}

async function readWithTimeout(
  reader: any,
  minBytes: number,
  timeoutMs: number
): Promise<Uint8Array | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const timer = setTimeout(() => {
    reader.cancel('timeout');
  }, timeoutMs);
  try {
    while (total < minBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    clearTimeout(timer);
    if (total === 0) return null;
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch {
    clearTimeout(timer);
    return null;
  }
}
