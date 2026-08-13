import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { recordUsage, getUsageLogs } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const logs = await getUsageLogs(
    c.env.DB,
    c.req.query('server_id'),
    c.req.query('agent_id'),
    c.req.query('limit') ? Number(c.req.query('limit')) : 50
  );
  return c.json(logs);
});

app.post('/', async (c) => {
  const body = await c.req.json();
  const id = await recordUsage(c.env.DB, {
    server_id: body.server_id,
    agent_id: body.agent_id,
    session_id: body.session_id,
    action: body.action,
    details: body.details ? JSON.stringify(body.details) : undefined,
  });
  return c.json({ id }, 201);
});

export default app;
