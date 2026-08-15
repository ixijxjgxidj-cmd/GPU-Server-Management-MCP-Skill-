import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { listServers, listProxies, updateServer, updateServerStatus, upsertReachability, getServerByHost, getServerById } from '../db/queries';

/**
 * Jump-box bridge API.
 *
 * Cloudflare Workers cannot open raw SSH sockets, so server load/status cannot be
 * probed from the edge. Instead a small agent runs on a reachable jump-box
 * (cn-fj-qz-2.server.zakocloud.com) and PULLs work from here on a timer:
 *
 *   GET  /api/bridge/tasks   -> the list of servers to probe, with connection
 *                               details, the exact probe command, and an ordered
 *                               SSH plan (direct first, then each socks5 proxy).
 *   POST /api/bridge/report  -> the agent posts probe results back; we write
 *                               live load + online status + proxy reachability.
 *
 * Both endpoints require the shared BRIDGE_TOKEN (Bearer or ?token=). The agent
 * itself can only reach this Worker through a socks5 proxy, so tasks also echo
 * an `egress` block telling it which proxy to curl through.
 */

const app = new Hono<{ Bindings: Env }>();

// Single combined probe: one SSH exec per target. Emits KEY=VALUE lines.
const PROBE_SCRIPT = [
  'echo "HOSTNAME=$(hostname 2>/dev/null)"',
  'echo "GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | awk \'{s+=$1;n++} END{print (n?int(s/n):0)}\')"',
  'echo "GPU_MEM_FREE=$(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | awk \'{s+=$1} END{print int(s/1024)}\')"',
  'echo "GPU_COUNT=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | wc -l)"',
  'echo "GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)"',
  'echo "RUNNING=$(nvidia-smi --query-compute-apps=pid --format=csv,noheader 2>/dev/null | wc -l)"',
  'echo "CPU=$(nproc 2>/dev/null)"',
  'echo "RAM=$(awk \'/MemTotal/{printf \\"%.0f\\", $2/1024/1024}\' /proc/meminfo 2>/dev/null)"',
  'echo "RAM_FREE=$(free -g 2>/dev/null | awk \'/^Mem:/{print $7}\')"',
  'echo "DISK=$(df -BG / 2>/dev/null | awk \'NR==2{gsub(/G/,\\"\\",$2); print $2}\')"',
  'echo "DISK_FREE=$(df -BG / 2>/dev/null | awk \'NR==2{gsub(/G/,\\"\\",$4); print $4}\')"',
  // Training-environment versions (semi-static; empty string if absent).
  // NB: keep NO double-quotes inside these $(...) — the whole line is echo "...".
  'echo "PYVER=$(python3 --version 2>&1 | awk \'{print $2}\')"',
  'echo "TORCH=$(python3 -c \'import torch;print(torch.__version__)\' 2>/dev/null)"',
  // CUDA: prefer driver CUDA from nvidia-smi, fall back to nvcc.
  'echo "CUDA=$(nvidia-smi 2>/dev/null | grep -oE \'CUDA Version: [0-9.]+\' | awk \'{print $3}\' | head -1)"',
  'echo "NVCC=$(nvcc --version 2>/dev/null | grep -oE \'release [0-9.]+\' | awk \'{print $2}\')"',
  // Live top-3 CPU processes: "TOPCPU=<%cpu>|<%mem>|<cmd>" one line each.
  'ps -eo pcpu,pmem,comm --sort=-pcpu 2>/dev/null | awk \'NR>1 && NR<=4 {printf "TOPCPU=%s|%s|%s\\n",$1,$2,$3}\'',
].join('; ');

function authOk(c: { req: { header: (k: string) => string | undefined; query: (k: string) => string | undefined } }, env: Env): boolean {
  const expected = env.BRIDGE_TOKEN;
  if (!expected) return false; // fail closed if unset
  const hdr = c.req.header('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  const token = (m ? m[1].trim() : '') || c.req.query('token') || '';
  return token.length > 0 && token === expected;
}

// GET /api/bridge/tasks — servers to probe + how to connect + how to report back.
app.get('/tasks', async (c) => {
  if (!authOk(c, c.env)) return c.json({ error: 'unauthorized' }, 401);

  const jumpHost = c.req.query('jump_host'); // optional: exclude the jump-box itself
  const all = await listServers(c.env.DB, undefined, true); // enabled only
  const proxies = await listProxies(c.env.DB);

  // socks5 proxies the agent can chain a ProxyCommand through (target-side SSH).
  const socks = proxies
    .filter(p => p.protocol === 'socks5')
    .map(p => ({ proxy_id: p.id, host: p.host, port: p.port, username: p.username, password: p.password }));

  const targets = all
    .filter(s => !jumpHost || s.host !== jumpHost)
    .map(s => {
      const connType = s.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard';
      // cloudflare_tunnel: the only sane path is through cloudflared (host = tunnel
      //   hostname, port is the tunnel SSH port). We still list direct as a first
      //   attempt for the rare case the tunnel host also resolves directly.
      // standard: direct first, then each socks5 proxy via ProxyCommand.
      const ssh_plan = connType === 'cloudflare_tunnel'
        ? [{ mode: 'cloudflared' as const }, { mode: 'direct' as const }]
        : [
            { mode: 'direct' as const },
            ...socks.map(p => ({ mode: 'socks5' as const, proxy_id: p.proxy_id, proxy_host: p.host, proxy_port: p.port, proxy_username: p.username, proxy_password: p.password })),
          ];
      const isJs = (s.notes || '').toLowerCase().includes('jumpserver') || String(s.tags || '').toLowerCase().includes('jumpserver');
      const jsTargetMatch = (s.notes || '').match(/select authorized host\s+(\d+|[^\s.]+)/i);
      return {
        server_id: s.id,
        name: s.name,
        host: s.host,
        port: s.port,
        username: s.username,
        auth_method: s.auth_method,
        key_path: s.key_path,
        key_content_b64: s.key_content ? btoa(s.key_content) : null,
        password: s.password,
        connection_type: connType,
        ssh_plan,
        is_jumpserver: isJs,
        jumpserver_target: jsTargetMatch ? jsTargetMatch[1] : (isJs ? '1' : null),
      };
    });

  return c.json({
    probe_script: PROBE_SCRIPT,
    report_url: '/api/bridge/report',
    // The agent reaches this Worker only through a socks5 proxy; use one of these.
    egress: { via: 'socks5', proxies: socks.map(p => ({ host: p.host, port: p.port, username: p.username, password: p.password })) },
    count: targets.length,
    targets,
  });
});

// POST /api/bridge/report — write back probe results.
app.post('/report', async (c) => {
  if (!authOk(c, c.env)) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json().catch(() => null) as {
    results?: Array<{
      server_id?: string;
      host?: string;
      online: boolean;
      ping_ms?: number | null;
      error?: string;
      connected_via?: string; // 'direct' | proxy_id
      load?: { gpu_util_pct?: number; gpu_mem_free_gb?: number; ram_free_gb?: number; disk_free_gb?: number; running_tasks?: number };
      hardware?: { gpu_model?: string; gpu_count?: number; cpu_cores?: number; ram_gb?: number; disk_gb?: number };
      env?: { python_version?: string; torch_version?: string; cuda_version?: string };
      top_cpu_tasks?: Array<{ cpu?: number; mem?: number; cmd?: string }>;
    }>;
  } | null;

  if (!body || !Array.isArray(body.results)) {
    return c.json({ error: 'expected { results: [...] }' }, 400);
  }

  const now = new Date().toISOString();
  let written = 0;
  const errors: string[] = [];

  for (const r of body.results) {
    try {
      // Resolve server id from id or host.
      let serverId = r.server_id;
      if (!serverId && r.host) {
        const s = await getServerByHost(c.env.DB, r.host);
        serverId = s?.id;
      }
      if (!serverId) { errors.push(`no server for ${r.host ?? '?'}`); continue; }

      const currentServer = await getServerById(c.env.DB, serverId);

      // 核心原则：Workers（Edge 节点）和 跳板机（Bridge Agent）任一连接成功即视为在线 (Online)！
      // 若跳板机 probe 失败，但该服务器在 Worker 侧在线，保持 online = true，避免被跳板机单侧网络/鉴权误判覆盖为离线
      const isOnline = Boolean(r.online || (currentServer && currentServer.status_online === 1));

      await updateServerStatus(c.env.DB, serverId, {
        online: isOnline,
        ping_ms: r.ping_ms ?? (currentServer ? currentServer.status_ping_ms : null),
        error: isOnline ? (r.online ? undefined : '跳板机探针未通，已沿用 Worker 在线状态') : r.error,
      });

      if (r.online) {
        const updates: Record<string, unknown> = {};
        const load = r.load ?? {};
        for (const k of ['gpu_util_pct', 'gpu_mem_free_gb', 'ram_free_gb', 'disk_free_gb', 'running_tasks'] as const) {
          if (load[k] !== undefined && load[k] !== null) updates[k] = load[k];
        }
        const hw = r.hardware ?? {};
        for (const k of ['gpu_model', 'gpu_count', 'cpu_cores', 'ram_gb', 'disk_gb'] as const) {
          if (hw[k] !== undefined && hw[k] !== null && hw[k] !== '') updates[k] = hw[k];
        }
        // Training-environment versions (semi-static; only overwrite when detected).
        const env = r.env ?? {};
        const envMap = { python_version: env.python_version, torch_version: env.torch_version, cuda_version: env.cuda_version };
        for (const [col, val] of Object.entries(envMap)) {
          if (val !== undefined && val !== null && val !== '') updates[col] = val;
        }
        // Live top-3 CPU tasks snapshot (stored as JSON text).
        if (Array.isArray(r.top_cpu_tasks)) {
          updates.top_cpu_tasks = JSON.stringify(r.top_cpu_tasks.slice(0, 3));
        }
        if (Object.keys(updates).length > 0) {
          updates.load_updated_at = now;
          await updateServer(c.env.DB, serverId, updates);
        }

        // Record which socks5 proxy reached it (connected_via = proxy_id).
        if (r.connected_via && r.connected_via !== 'direct') {
          await upsertReachability(c.env.DB, r.connected_via, serverId, true, r.ping_ms ?? null);
        }
      }
      written++;
    } catch (e) {
      errors.push(`${r.server_id ?? r.host ?? '?'}: ${e}`);
    }
  }

  return c.json({ success: true, written, errors, at: now });
});

export default app;
