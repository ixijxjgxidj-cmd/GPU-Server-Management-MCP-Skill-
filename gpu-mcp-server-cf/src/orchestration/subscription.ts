import type { DBProxy } from '../db/schema';

export interface ParsedNode {
  name: string;
  host: string;
  port: number;
  protocol: 'socks5' | 'http';
  username?: string | null;
  password?: string | null;
  region?: string | null;
}

function detectRegion(name: string): string | null {
  const n = name.toUpperCase();
  if (n.includes('HK') || n.includes('香港') || n.includes('HONG KONG')) return 'HK';
  if (n.includes('TW') || n.includes('台湾') || n.includes('TAIWAN')) return 'TW';
  if (n.includes('JP') || n.includes('日本') || n.includes('JAPAN') || n.includes('TOKYO')) return 'JP';
  if (n.includes('SG') || n.includes('新加坡') || n.includes('SINGAPORE')) return 'SG';
  if (n.includes('US') || n.includes('美国') || n.includes('UNITED STATES') || n.includes('LA') || n.includes('SILICON')) return 'US';
  if (n.includes('KR') || n.includes('韩国') || n.includes('KOREA') || n.includes('SEOUL')) return 'KR';
  if (n.includes('UK') || n.includes('英国') || n.includes('LONDON') || n.includes('GB')) return 'UK';
  if (n.includes('DE') || n.includes('德国') || n.includes('GERMANY') || n.includes('FRANKFURT')) return 'DE';
  return null;
}

export function parseBase64OrText(raw: string): string {
  const trimmed = raw.trim();
  // Check if base64 encoded
  if (!trimmed.includes('\n') && !trimmed.startsWith('proxies:') && !trimmed.startsWith('payload:')) {
    try {
      return atob(trimmed);
    } catch {
      // not base64 or invalid base64, return as-is
    }
  }
  return trimmed;
}

export function parseSubscriptionContent(content: string, subscriptionId?: string): Omit<DBProxy, 'id' | 'created_at' | 'updated_at'>[] {
  const decoded = parseBase64OrText(content);
  const nodes: Omit<DBProxy, 'id' | 'created_at' | 'updated_at'>[] = [];

  // 1. Try Clash YAML parsing (simple line-based YAML parser)
  if (decoded.includes('proxies:') || decoded.includes('Proxy:')) {
    const lines = decoded.split('\n');
    let inProxies = false;
    let currentProxy: Record<string, string | number> | null = null;

    const commitCurrent = () => {
      if (currentProxy && currentProxy.server && currentProxy.port) {
        const pType = String(currentProxy.type || 'socks5').toLowerCase();
        const proto: 'socks5' | 'http' = (pType === 'http' || pType === 'https') ? 'http' : 'socks5';
        const name = String(currentProxy.name || `${currentProxy.server}:${currentProxy.port}`);
        nodes.push({
          name,
          host: String(currentProxy.server),
          port: Number(currentProxy.port),
          username: currentProxy.username ? String(currentProxy.username) : null,
          password: currentProxy.password ? String(currentProxy.password) : null,
          location: currentProxy.location ? String(currentProxy.location) : null,
          protocol: proto,
          subscription_id: subscriptionId ?? null,
          region: detectRegion(name),
          target_scores: null,
          is_alive: 1,
        });
      }
      currentProxy = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('proxies:') || line.startsWith('Proxy:')) {
        inProxies = true;
        continue;
      }
      if (inProxies) {
        if (line.startsWith('- name:') || line.startsWith('- {name:')) {
          commitCurrent();
          currentProxy = {};
          // Inline JSON-like format
          const nameMatch = line.match(/name:\s*['"]?([^,'"}]+)['"]?/i);
          if (nameMatch) currentProxy.name = nameMatch[1].trim();
          const serverMatch = line.match(/server:\s*['"]?([^,'"}]+)['"]?/i);
          if (serverMatch) currentProxy.server = serverMatch[1].trim();
          const portMatch = line.match(/port:\s*(\d+)/i);
          if (portMatch) currentProxy.port = parseInt(portMatch[1]);
          const typeMatch = line.match(/type:\s*['"]?([^,'"}]+)['"]?/i);
          if (typeMatch) currentProxy.type = typeMatch[1].trim();
          const userMatch = line.match(/username:\s*['"]?([^,'"}]+)['"]?/i);
          if (userMatch) currentProxy.username = userMatch[1].trim();
          const passMatch = line.match(/password:\s*['"]?([^,'"}]+)['"]?/i);
          if (passMatch) currentProxy.password = passMatch[1].trim();
        } else if (currentProxy && line.includes(':')) {
          const colonIdx = line.indexOf(':');
          const key = line.slice(0, colonIdx).trim().replace(/^-\s*/, '');
          const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (key === 'name') currentProxy.name = val;
          if (key === 'server') currentProxy.server = val;
          if (key === 'port') currentProxy.port = parseInt(val);
          if (key === 'type') currentProxy.type = val;
          if (key === 'username') currentProxy.username = val;
          if (key === 'password') currentProxy.password = val;
        } else if (line && !line.startsWith('#') && !line.startsWith('-') && !rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
          // Exited proxies block
          inProxies = false;
          commitCurrent();
        }
      }
    }
    commitCurrent();
  }

  // 2. Line-by-line URI parsing (socks5://, http://, ss://, vmess://, etc.)
  const uriLines = decoded.split(/[\r\n]+/);
  for (const rawUri of uriLines) {
    const uri = rawUri.trim();
    if (!uri || uri.startsWith('#')) continue;

    if (uri.startsWith('socks5://') || uri.startsWith('socks://') || uri.startsWith('http://') || uri.startsWith('https://')) {
      try {
        const u = new URL(uri);
        const name = decodeURIComponent(u.hash.replace(/^#/, '')) || `${u.hostname}:${u.port}`;
        const proto: 'socks5' | 'http' = uri.startsWith('http') ? 'http' : 'socks5';
        nodes.push({
          name,
          host: u.hostname,
          port: parseInt(u.port) || (proto === 'http' ? 8080 : 1080),
          username: u.username ? decodeURIComponent(u.username) : null,
          password: u.password ? decodeURIComponent(u.password) : null,
          location: null,
          protocol: proto,
          subscription_id: subscriptionId ?? null,
          region: detectRegion(name),
          target_scores: null,
          is_alive: 1,
        });
      } catch {}
    } else if (uri.startsWith('ss://')) {
      try {
        // ss://base64(user:pass@host:port)#name or ss://base64(user:pass)@host:port#name
        const hashIdx = uri.indexOf('#');
        const name = hashIdx !== -1 ? decodeURIComponent(uri.slice(hashIdx + 1)) : 'SS Node';
        const body = uri.slice(5, hashIdx !== -1 ? hashIdx : undefined);
        let host = '';
        let port = 8388;
        let password = '';
        if (body.includes('@')) {
          const parts = body.split('@');
          const hostPort = parts[1].split(':');
          host = hostPort[0];
          port = parseInt(hostPort[1]) || 8388;
          try { password = atob(parts[0]); } catch { password = parts[0]; }
        } else {
          try {
            const dec = atob(body);
            if (dec.includes('@')) {
              const parts = dec.split('@');
              const hostPort = parts[1].split(':');
              host = hostPort[0];
              port = parseInt(hostPort[1]) || 8388;
              password = parts[0];
            }
          } catch {}
        }
        if (host) {
          nodes.push({
            name,
            host,
            port,
            username: null,
            password: password || null,
            location: null,
            protocol: 'socks5',
            subscription_id: subscriptionId ?? null,
            region: detectRegion(name),
            target_scores: null,
            is_alive: 1,
          });
        }
      } catch {}
    } else if (uri.startsWith('vmess://')) {
      try {
        const b64 = uri.slice(8);
        const jsonStr = atob(b64);
        const v = JSON.parse(jsonStr);
        if (v.add && v.port) {
          const name = v.ps || `${v.add}:${v.port}`;
          nodes.push({
            name,
            host: v.add,
            port: parseInt(v.port),
            username: null,
            password: v.id || null,
            location: null,
            protocol: 'socks5',
            subscription_id: subscriptionId ?? null,
            region: detectRegion(name),
            target_scores: null,
            is_alive: 1,
          });
        }
      } catch {}
    }
  }

  return nodes;
}
