// Cloudflare Workers TCP sockets - must be imported from this module
import { connect } from 'cloudflare:sockets';

export interface PingResult {
  reachable: boolean;
  latency_ms: number | null;
  error?: string;
}

export interface SSHBannerResult {
  reachable: boolean;
  latency_ms: number | null;
  banner?: string;
  ssh_version?: string;
  os_hint?: string;
  error?: string;
}

/**
 * TCP ping: attempt to establish a TCP connection to host:port.
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
    return { reachable: false, latency_ms: null, error: `TCP ping failed: ${err}` };
  }
}

/**
 * Connect to SSH port and read the server's SSH banner.
 * The SSH protocol requires the server to send its banner immediately upon connection.
 * Returns the banner string and parsed info.
 */
export async function grabSSHBanner(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<SSHBannerResult> {
  const startTime = Date.now();
  let socket: any;
  try {
    socket = connect({ hostname: host, port });
    await socket.opened;

    // Read the SSH banner (server sends it immediately)
    const reader = socket.readable.getReader();
    const timer = setTimeout(() => { try { reader.cancel('timeout'); } catch {} }, timeoutMs);

    // SSH banner is typically under 255 bytes, read up to 512
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 512) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) { chunks.push(value); total += value.length; }
      // If we have a complete line (ends with \n), we can stop
      if (value && value[value.length - 1] === 0x0a) break;
    }
    clearTimeout(timer);
    reader.releaseLock();

    const latencyMs = Date.now() - startTime;
    socket.close();

    if (total === 0) {
      return { reachable: true, latency_ms: latencyMs, error: 'SSH banner not received (connection closed immediately)' };
    }

    // Combine chunks and decode
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
    const banner = new TextDecoder().decode(combined).trim();

    // Parse the banner: "SSH-2.0-OpenSSH_8.9p1 Ubuntu-3"
    const sshVersionMatch = banner.match(/SSH-[\d.]+-([^\s]+)/);
    const sshVersion = sshVersionMatch ? sshVersionMatch[1] : undefined;

    // Try to extract OS hint from the banner tail
    let osHint: string | undefined;
    if (banner.includes('Ubuntu')) osHint = 'Ubuntu';
    else if (banner.includes('Debian')) osHint = 'Debian';
    else if (banner.includes('CentOS')) osHint = 'CentOS';
    else if (banner.includes('RHEL')) osHint = 'RHEL';
    else if (banner.includes('Fedora')) osHint = 'Fedora';
    else if (banner.includes('Amazon')) osHint = 'Amazon Linux';
    else if (banner.match(/OpenSSH.*[Bb]untu/)) osHint = 'Ubuntu';
    else if (banner.includes('Windows')) osHint = 'Windows';
    else if (banner.includes('dropbear')) osHint = 'Embedded Linux (Dropbear)';

    return {
      reachable: true,
      latency_ms: latencyMs,
      banner: banner.substring(0, 255),
      ssh_version: sshVersion,
      os_hint: osHint,
    };
  } catch (err) {
    if (socket) { try { socket.close(); } catch {} }
    return { reachable: false, latency_ms: null, error: `SSH banner grab failed: ${err}` };
  }
}
