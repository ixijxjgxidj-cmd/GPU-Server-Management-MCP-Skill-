import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { listServers, getServerById, createServer, updateServer, deleteServer, queryServersByAbility, getReachability, updateServerTask, releaseServerTask, updateServerStatus, setServerEnabled } from '../db/queries';
import { dbServerToDetail } from '../models/server';
import { tcpPing, grabSSHBanner } from '../probe/ping';

const app = new Hono<{ Bindings: Env }>();

// List all servers
app.get('/', async (c) => {
  const tag = c.req.query('tag');
  const servers = await listServers(c.env.DB, tag);
  return c.json(servers);
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
    connection_type: body.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard',
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

// Claim server (mark as in use)
app.post('/:id/claim', async (c) => {
  const body = await c.req.json();
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);
  await updateServerTask(c.env.DB, server.id, {
    agent: body.agent || 'unknown',
    task: body.task || 'unspecified',
  });
  return c.json({
    success: true,
    server_id: server.id,
    server_name: server.name,
    claimed_by: body.agent,
    task: body.task,
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

// Probe server connectivity (TCP ping + SSH banner grab)
app.post('/probe/:id', async (c) => {
  const server = await getServerById(c.env.DB, c.req.param('id'));
  if (!server) return c.json({ error: 'Not found' }, 404);

  const pingResult = await tcpPing(server.host, server.port);
  await updateServerStatus(c.env.DB, server.id, {
    online: pingResult.reachable,
    ping_ms: pingResult.latency_ms,
    error: pingResult.error,
  });

  // If reachable, also grab SSH banner to detect OS and SSH version
  let bannerResult: any = {};
  if (pingResult.reachable) {
    bannerResult = await grabSSHBanner(server.host, server.port);
    if (bannerResult.banner) {
      await updateServer(c.env.DB, server.id, {
        ssh_banner: bannerResult.banner,
        os_hint: bannerResult.os_hint || null,
      });
    }
  }

  return c.json({
    success: true,
    ...pingResult,
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

export default app;
