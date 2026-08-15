import { Hono } from 'hono';
import type { Env } from '../db/schema';
import {
  listProxies,
  getProxyById,
  createProxy,
  updateProxy,
  deleteProxy,
  listProxySubscriptions,
  createProxySubscription,
  deleteProxySubscription,
  getProxySubscription,
  updateProxySubscription,
  batchUpsertProxies,
} from '../db/queries';
import { parseSubscriptionContent } from '../orchestration/subscription';

const app = new Hono<{ Bindings: Env }>();

// ===== Proxy Node Routes =====

app.get('/', async (c) => {
  const proxies = await listProxies(c.env.DB);
  return c.json(proxies);
});

app.get('/subscriptions', async (c) => {
  const subs = await listProxySubscriptions(c.env.DB);
  return c.json(subs);
});

app.post('/subscriptions', async (c) => {
  const body = await c.req.json();
  const url = body.url as string;
  const name = body.name || `订阅-${new Date().toISOString().slice(0, 10)}`;
  let rawContent = body.raw_content as string | undefined;

  if (!url && !rawContent) {
    return c.json({ error: 'url or raw_content is required' }, 400);
  }

  if (!rawContent && url) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'ClashforWindows/0.20.39 clash-verge/v1.7.7 Mozilla/5.0',
          'Accept': '*/*',
        },
      });
      if (!resp.ok) {
        return c.json({ error: `无法获取订阅内容: HTTP ${resp.status}` }, 400);
      }
      rawContent = await resp.text();
    } catch (e: any) {
      return c.json({ error: `请求订阅 URL 失败: ${e.message}` }, 400);
    }
  }

  const subId = await createProxySubscription(c.env.DB, { name, url: url || 'raw://custom' });
  const nodes = parseSubscriptionContent(rawContent || '', subId);
  let importedCount = 0;
  if (nodes.length > 0) {
    importedCount = await batchUpsertProxies(c.env.DB, nodes);
    await updateProxySubscription(c.env.DB, subId, {
      node_count: importedCount,
      last_synced_at: new Date().toISOString(),
    });
  }

  return c.json({
    success: true,
    subscription_id: subId,
    name,
    node_count: importedCount,
    message: `✔ 成功导入订阅 [${name}]，已同步 ${importedCount} 个节点！`,
  }, 201);
});

app.post('/subscriptions/:id/sync', async (c) => {
  const subId = c.req.param('id');
  const sub = await getProxySubscription(c.env.DB, subId);
  if (!sub) return c.json({ error: 'Subscription not found' }, 404);

  try {
    const resp = await fetch(sub.url, {
      headers: {
        'User-Agent': 'ClashforWindows/0.20.39 clash-verge/v1.7.7 Mozilla/5.0',
        'Accept': '*/*',
      },
    });
    if (!resp.ok) return c.json({ error: `同步失败: HTTP ${resp.status}` }, 400);
    const content = await resp.text();
    const nodes = parseSubscriptionContent(content, subId);
    const count = await batchUpsertProxies(c.env.DB, nodes);
    await updateProxySubscription(c.env.DB, subId, {
      node_count: count,
      last_synced_at: new Date().toISOString(),
    });
    return c.json({ success: true, count, message: `✔ 成功同步 ${count} 个节点！` });
  } catch (e: any) {
    return c.json({ error: `网络请求失败: ${e.message}` }, 500);
  }
});

app.delete('/subscriptions/:id', async (c) => {
  const success = await deleteProxySubscription(c.env.DB, c.req.param('id'));
  return c.json({ success });
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
    region: body.region ?? null,
    is_alive: body.is_alive ?? 1,
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
