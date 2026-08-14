import type { DBServer } from '../db/schema';

export interface ReachableProxy {
  id: string; name: string; host: string; port: number; protocol: string; latency_ms: number | null;
}

export interface ProxyAcceleration {
  proxy: ReachableProxy;
  commands: {
    env: string;
    proxychains: string;
    git: string;
    wget: string;
    pip: string;
  };
}

export interface JumpRelay {
  jump_server: { id: string; name: string; host: string; port: number; username: string };
  steps: string[];
}

export interface NetworkRelayResult {
  proxy_acceleration?: ProxyAcceleration;
  jump_relay?: JumpRelay;
  how_to: string;
}

function proxyUrl(p: ReachableProxy): string {
  return `${p.protocol}://${p.host}:${p.port}`;
}

export function buildProxyAcceleration(proxy: ReachableProxy, resourceUrl: string): ProxyAcceleration {
  const u = proxyUrl(proxy);
  return {
    proxy,
    commands: {
      env: `export http_proxy=${u} https_proxy=${u}`,
      proxychains: `proxychains4 wget ${resourceUrl}`,
      git: `git config --global http.proxy ${u}`,
      wget: `wget -e use_proxy=yes -e https_proxy=${u} ${resourceUrl}`,
      pip: `pip install --proxy ${u} <pkg>`,
    },
  };
}

export function buildJumpRelay(jump: DBServer, target: DBServer, resourceUrl: string): JumpRelay {
  return {
    jump_server: { id: jump.id, name: jump.name, host: jump.host, port: jump.port, username: jump.username },
    steps: [
      `在跳板机 ${jump.host}: wget ${resourceUrl} -O /tmp/payload`,
      `从跳板机传到目标机: scp -3 /tmp/payload ${target.username}@${target.host}:/data/  (或经代理的 rsync)`,
    ],
  };
}

export function planRelay(
  target: DBServer,
  resourceUrl: string,
  reachableProxies: ReachableProxy[],
  jumpCandidates: DBServer[]
): NetworkRelayResult {
  const result: NetworkRelayResult = {
    how_to: '优先用 proxy_acceleration 让目标机自己加速;目标机完全不通时用 jump_relay 中转。',
  };
  if (reachableProxies.length > 0) {
    const best = [...reachableProxies].sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity))[0];
    result.proxy_acceleration = buildProxyAcceleration(best, resourceUrl);
  }
  const jump = jumpCandidates.find(s =>
    s.id !== target.id && s.status_online === 1 &&
    (s.direct_when_no_proxy === 1 || (s.v2ray_available === 1 && s.direct_when_proxy_available === 1))
  );
  if (jump) result.jump_relay = buildJumpRelay(jump, target, resourceUrl);
  if (!result.proxy_acceleration && !result.jump_relay) {
    return {
      how_to: '无可达代理也无网络通畅的跳板机;建议先 verify_server_connectivity 诊断或 add_proxy 增加代理节点。',
    };
  }
  return result;
}
