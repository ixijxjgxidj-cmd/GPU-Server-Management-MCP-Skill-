import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { listServers, getServerById, createServer, updateServer, deleteServer, queryServersByAbility, getReachability, updateServerTask, releaseServerTask, updateServerStatus, setServerEnabled, listBackupIndexes, deleteBackupIndexById, searchBackupIndexesRAG, listProxies, upsertReachability, getServerPitfalls, getPitfallsForServer, getGlobalProxyPitfalls, addServerPitfall, deleteServerPitfall } from '../db/queries';
import { dbServerToDetail } from '../models/server';
import { tcpPing, grabSSHBanner } from '../probe/ping';
import { testViaSocks5 } from '../probe/socks5';

const app = new Hono<{ Bindings: Env }>();

// GET /api/servers/pitfalls/proxy: Get all permanent global proxy zone pitfalls
app.get('/pitfalls/proxy', async (c) => {
  const list = await getGlobalProxyPitfalls(c.env.DB);
  return c.json(list);
});

// POST /api/servers/pitfalls/proxy: Add a permanent global proxy pitfall
app.post('/pitfalls/proxy', async (c) => {
  const body = await c.req.json();
  const title = body.title?.trim();
  const description = body.description?.trim();
  const workaround = body.workaround?.trim();
  const severity = body.severity || 'warning';
  const tags = Array.isArray(body.tags) ? body.tags : ['proxy'];
  const agent = body.agent?.trim() || 'user';

  if (!title || !description || !workaround) {
    return c.json({ error: 'title, description, and workaround are required' }, 400);
  }

  const pitfall = await addServerPitfall(c.env.DB, {
    server_id: 'global',
    category: 'proxy',
    is_global: 1,
    title,
    description,
    workaround,
    severity,
    tags,
    agent,
  });

  return c.json({ success: true, is_global: true, category: 'proxy', pitfall });
});

// List all servers
app.get('/', async (c) => {
  const tag = c.req.query('tag');
  const servers = await listServers(c.env.DB, tag);
  const ids = servers.map(s => s.id);
  const pitfallsMap = await getServerPitfalls(c.env.DB, ids);
  const enriched = servers.map(s => ({
    ...s,
    pitfalls: pitfallsMap[s.id] ?? [],
    pitfalls_count: (pitfallsMap[s.id] ?? []).length,
  }));
  return c.json(enriched);
});

// Query by ability
app.get('/query', async (c) => {
  const filters = {
    gpu_model: c.req.query('gpu_model'),
    min_ram_gb: c.req.query('min_ram_gb') ? Number(c.req.query('min_ram_gb')) : undefined,
    min_cpu_cores: c.req.query('min_cpu_cores') ? Number(c.req.query('min_cpu_cores')) : undefined,
    min_disk_gb: c.req.query('min_disk_gb') ? Number(c.req.query('min_disk_gb')) : undefined,
    status_online: c.req.query('status_online') === 'true' ? true : c.req.query('status_online') === 'false' ? false : undefined,
  };
  const servers = await queryServersByAbility(c.env.DB, filters);
  return c.json(servers);
});

// Get all backup indexes (with optional RAG semantic search ?q=...)
app.get('/backups/all', async (c) => {
  const q = c.req.query('q');
  const type = c.req.query('type');
  const host = c.req.query('host');
  if (q && q.trim()) {
    const results = await searchBackupIndexesRAG(c.env.DB, q.trim(), 50);
    return c.json(results);
  }
  const all = await listBackupIndexes(c.env.DB, { server_host: host, backup_type: type });
  return c.json(all);
});

// Delete a backup index
app.delete('/backups/:id', async (c) => {
  const id = c.req.param('id');
  const success = await deleteBackupIndexById(c.env.DB, id);
  return c.json({ success, id });
});

// Get all pre-cached datasets across all servers
app.get('/datasets/all', async (c) => {
  const servers = await listServers(c.env.DB, undefined, false);
  const allDatasets: Array<{
    server_id: string;
    server_name: string;
    server_host: string;
    server_port: number;
    status_online: boolean;
    name: string;
    path: string;
    size_gb: number;
    description: string;
    added_at?: string;
  }> = [];

  for (const s of servers) {
    if (!s.datasets) continue;
    try {
      const list = JSON.parse(s.datasets);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.name && item.path) {
            allDatasets.push({
              server_id: s.id,
              server_name: s.name,
              server_host: s.host,
              server_port: s.port,
              status_online: Boolean(s.status_online),
              name: String(item.name),
              path: String(item.path),
              size_gb: typeof item.size_gb === 'number' ? item.size_gb : 0,
              description: String(item.description || ''),
              added_at: item.added_at,
            });
          }
        }
      }
    } catch {
      // ignore parse error
    }
  }

  return c.json(allDatasets);
});

// Get single server (with reachable proxies)
app.get('/:id', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  const reachable = await getReachability(c.env.DB, server.id);
  const detail = dbServerToDetail(server, reachable.map(r => ({ id: r.proxy_id, name: r.proxy_name, latency_ms: r.latency_ms })));
  return c.json(detail);
});

// Create server
app.post('/', async (c) => {
  const body = await c.req.json();
  const id = await createServer(c.env.DB, {
    name: body.name,
    provider: body.provider ?? null,
    vendor_url: body.vendor_url ?? null,
    host: body.host,
    port: body.port ?? 22,
    username: body.username,
    auth_method: body.auth_method,
    key_path: body.key_path ?? null,
    key_content: body.key_content ?? null,
    password: body.password ?? null,
    v2ray_available: body.v2ray_available ? 1 : 0,
    direct_when_proxy_available: body.direct_when_proxy_available ? 1 : 0,
    direct_when_no_proxy: body.direct_when_no_proxy ? 1 : 0,
    gpu_model: body.gpu_model ?? null,
    gpu_memory_gb: body.gpu_memory_gb ?? null,
    gpu_count: body.gpu_count ?? null,
    cpu_cores: body.cpu_cores ?? null,
    ram_gb: body.ram_gb ?? null,
    disk_gb: body.disk_gb ?? null,
    default_proxy_id: body.default_proxy_id ?? null,
    notes: body.notes ?? null,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    connection_type: (body.connection_type === 'tunnel' || body.connection_type === 'cloudflare_tunnel') ? 'cloudflare_tunnel' : 'standard',
    is_jump_host: body.is_jump_host ? 1 : 0,
  });
  return c.json({ id }, 201);
});

// Update server
app.put('/:id', async (c) => {
  const body = await c.req.json();
  const success = await updateServer(c.env.DB, c.req.param('id'), body);
  return c.json({ success });
});

// Delete server
app.delete('/:id', async (c) => {
  const success = await deleteServer(c.env.DB, c.req.param('id'));
  return c.json({ success });
});

// Claim server (mark as in use with optional countdown timer)
app.post('/:id/claim', async (c) => {
  const body = await c.req.json();
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  const duration = typeof body.duration_minutes === 'number' && body.duration_minutes > 0 ? body.duration_minutes : undefined;
  const { started_at, expires_at } = await updateServerTask(c.env.DB, server.id, {
    agent: body.agent || 'web-user',
    task: body.task || 'manual-task',
    duration_minutes: duration,
  });
  if (body.server_expires_at !== undefined) {
    await updateServer(c.env.DB, server.id, {
      server_expires_at: body.server_expires_at,
    });
  }
  return c.json({
    success: true,
    server_id: server.id,
    server_name: server.name,
    claimed_by: body.agent || 'web-user',
    task: body.task || 'manual-task',
    duration_minutes: duration ?? null,
    started_at,
    expires_at,
    server_expires_at: body.server_expires_at !== undefined ? body.server_expires_at : server.server_expires_at,
  });
});

// Update physical server lease / expiration
app.post('/:id/lease', async (c) => {
  const body = await c.req.json();
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  const serverExpiresAt = body.server_expires_at !== undefined ? body.server_expires_at : null;
  await updateServer(c.env.DB, server.id, {
    server_expires_at: serverExpiresAt,
  });
  return c.json({
    success: true,
    server_id: server.id,
    server_expires_at: serverExpiresAt,
  });
});

// Release server (clear task marker)
app.post('/:id/release', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  await releaseServerTask(c.env.DB, server.id);
  return c.json({
    success: true,
    server_id: server.id,
    server_name: server.name,
  });
});

// Probe server connectivity (Direct TCP ping + Proxy fallback + SSH banner grab)
app.post('/probe/:id', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);

  // 1. Direct ping with 6000ms timeout
  const pingResult = await tcpPing(server.host, server.port, 6000);
  let isOnline = pingResult.reachable;
  let finalPingMs = pingResult.latency_ms;
  let bannerResult: any = {};
  let viaProxyName: string | null = null;

  let updateFields: any = {};
  if (pingResult.reachable) {
    bannerResult = await grabSSHBanner(server.host, server.port, 6000);
    if (bannerResult.banner) {
      updateFields.ssh_banner = bannerResult.banner;
      updateFields.os_hint = bannerResult.os_hint || null;
    }
    updateFields.direct_when_no_proxy = 1;
    // Also test proxies if present to update reachability and flags
    const proxies = await listProxies(c.env.DB);
    let anyProxyOk = false;
    for (const proxy of proxies) {
      if (proxy.protocol === 'socks5') {
        const pr = await testViaSocks5(proxy.host, proxy.port, server.host, server.port, proxy.username ?? undefined, proxy.password ?? undefined);
        await upsertReachability(c.env.DB, proxy.id, server.id, pr.reachable, pr.latency_ms);
        if (pr.reachable) anyProxyOk = true;
      }
    }
    if (anyProxyOk) {
      updateFields.v2ray_available = 1;
      updateFields.direct_when_proxy_available = 1;
    }
  } else {
    // 2. Direct ping failed: try reachable proxies in pool
    const proxies = await listProxies(c.env.DB);
    for (const proxy of proxies) {
      if (proxy.protocol === 'socks5') {
        const pr = await testViaSocks5(proxy.host, proxy.port, server.host, server.port, proxy.username ?? undefined, proxy.password ?? undefined);
        await upsertReachability(c.env.DB, proxy.id, server.id, pr.reachable, pr.latency_ms);
        if (pr.reachable && !isOnline) {
          isOnline = true;
          finalPingMs = pr.latency_ms;
          viaProxyName = proxy.name;
        }
      }
    }
    if (isOnline) {
      updateFields.v2ray_available = 1;
      updateFields.direct_when_no_proxy = 0;
      updateFields.direct_when_proxy_available = 0;
    }
  }

  if (Object.keys(updateFields).length > 0) {
    await updateServer(c.env.DB, server.id, updateFields);
  }

  await updateServerStatus(c.env.DB, server.id, {
    online: isOnline,
    ping_ms: finalPingMs,
    error: isOnline ? (viaProxyName ? `直连受阻，通过代理 [${viaProxyName}] 可达` : undefined) : pingResult.error,
  });

  return c.json({
    success: true,
    reachable: isOnline,
    latency_ms: finalPingMs,
    via_proxy: viaProxyName,
    error: isOnline ? undefined : pingResult.error,
    ssh: bannerResult.banner ? {
      banner: bannerResult.banner,
      ssh_version: bannerResult.ssh_version,
      os_hint: bannerResult.os_hint,
    } : null,
  });
});

// Enable/disable server
app.post('/:id/enable', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  await setServerEnabled(c.env.DB, server.id, true);
  return c.json({ success: true, enabled: true, server_id: server.id });
});

app.post('/:id/disable', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  await setServerEnabled(c.env.DB, server.id, false);
  return c.json({ success: true, enabled: false, server_id: server.id });
});

// ===== Dataset & Backup Management APIs =====

// Register or update a dataset on a server
app.post('/:id/datasets', async (c) => {
  const serverId = c.req.param('id');
  const body = await c.req.json();
  const name = body.name?.trim();
  const path = body.path?.trim();
  const sizeGb = typeof body.size_gb === 'number' ? body.size_gb : parseFloat(body.size_gb) || 0;
  const description = body.description?.trim() || '';

  if (!name || !path) {
    return c.json({ error: 'Name and path are required' }, 400);
  }

  const server = await getServerById(c.env.DB, serverId);
  if (!server) return c.json({ error: 'Server not found' }, 404);

  let datasets: Array<{ name: string; path: string; size_gb?: number; description?: string; added_at?: string }> = [];
  if (server.datasets) {
    try { datasets = JSON.parse(server.datasets); } catch {}
  }

  const existingIdx = datasets.findIndex(d => d.name === name);
  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    datasets[existingIdx] = {
      name,
      path,
      size_gb: sizeGb,
      description,
      added_at: datasets[existingIdx].added_at || now,
    };
  } else {
    datasets.push({
      name,
      path,
      size_gb: sizeGb,
      description,
      added_at: now,
    });
  }

  await c.env.DB.prepare('UPDATE servers SET datasets = ? WHERE id = ?')
    .bind(JSON.stringify(datasets), serverId)
    .run();

  return c.json({ success: true, server_id: serverId, dataset: { name, path, size_gb: sizeGb, description } });
});

// Remove a dataset from a server
app.delete('/:id/datasets/:name', async (c) => {
  const serverId = c.req.param('id');
  const name = decodeURIComponent(c.req.param('name'));

  const server = await getServerById(c.env.DB, serverId);
  if (!server) return c.json({ error: 'Server not found' }, 404);

  let datasets: Array<{ name: string; path: string; size_gb?: number; description?: string; added_at?: string }> = [];
  if (server.datasets) {
    try { datasets = JSON.parse(server.datasets); } catch {}
  }

  const filtered = datasets.filter(d => d.name !== name);
  await c.env.DB.prepare('UPDATE servers SET datasets = ? WHERE id = ?')
    .bind(JSON.stringify(filtered), serverId)
    .run();

  return c.json({ success: true, server_id: serverId, removed_name: name });
});

// ===== Pitfall Endpoints (踩坑记录与避坑) =====

// Get all pitfalls for a server
app.get('/:id/pitfalls', async (c) => {
  const serverId = c.req.param('id');
  const list = await getPitfallsForServer(c.env.DB, serverId);
  return c.json(list);
});

// Add a pitfall for a server (or global/proxy zone)
app.post('/:id/pitfalls', async (c) => {
  const serverId = c.req.param('id');
  const body = await c.req.json();
  const title = body.title?.trim();
  const description = body.description?.trim();
  const workaround = body.workaround?.trim();
  const severity = body.severity || 'warning';
  const category = body.category?.trim();
  const isGlobal = body.is_global === true || serverId === 'global' || serverId === 'proxy' || category === 'proxy';
  const tags = Array.isArray(body.tags) ? body.tags : undefined;
  const agent = body.agent?.trim() || 'user';

  if (!title || !description || !workaround) {
    return c.json({ error: 'title, description, and workaround are required' }, 400);
  }

  if (serverId !== 'global' && serverId !== 'proxy') {
    const server = await getServerById(c.env.DB, serverId);
    if (!server) return c.json({ error: 'Server not found' }, 404);
  }

  const pitfall = await addServerPitfall(c.env.DB, {
    server_id: serverId,
    category,
    is_global: isGlobal,
    title,
    description,
    workaround,
    severity,
    tags,
    agent,
  });

  return c.json({ success: true, server_id: serverId, is_global: isGlobal, pitfall });
});

// Delete a pitfall
app.delete('/pitfalls/:id', async (c) => {
  const id = c.req.param('id');
  const success = await deleteServerPitfall(c.env.DB, id);
  return c.json({ success, id });
});

export default app;
