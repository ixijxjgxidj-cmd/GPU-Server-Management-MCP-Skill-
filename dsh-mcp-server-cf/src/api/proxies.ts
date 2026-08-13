import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { listProxies, getProxyById, createProxy, updateProxy, deleteProxy } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const proxies = await listProxies(c.env.DB);
  return c.json(proxies);
});

app.get('/:id', async (c) => {
  const proxy = await getProxyById(c.env.DB, c.req.param('id'));
  if (!proxy) return c.json({ error: 'Not found' }, 404);
  return c.json(proxy);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  const id = await createProxy(c.env.DB, {
    name: body.name,
    host: body.host,
    port: body.port ?? 1080,
    username: body.username ?? null,
    password: body.password ?? null,
    location: body.location ?? null,
    protocol: body.protocol ?? 'socks5',
  });
  return c.json({ id }, 201);
});

app.put('/:id', async (c) => {
  const body = await c.req.json();
  const success = await updateProxy(c.env.DB, c.req.param('id'), body);
  return c.json({ success });
});

app.delete('/:id', async (c) => {
  const success = await deleteProxy(c.env.DB, c.req.param('id'));
  return c.json({ success });
});

export default app;
