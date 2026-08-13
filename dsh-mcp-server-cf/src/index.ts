import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './db/schema';
import { handleMcpRequest } from './mcp/handler';
import { createSession, handleSseConnection, getSession, removeSession } from './mcp/transport';
import serversApi from './api/servers';
import proxiesApi from './api/proxies';
import verifyApi from './api/verify';
import usageApi from './api/usage';
import aiApi from './api/ai';
import { HTML as frontendHtml } from './frontend/html';

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend
// TODO: Restrict CORS origin in production. Currently allows all origins.
// Replace with: app.use('*', cors({ origin: 'https://yourdomain.com' }));
app.use('*', cors());

// === MCP Endpoints ===

// SSE transport: client connects here to receive events
app.get('/mcp', async (c) => {
  const session = createSession();
  return handleSseConnection(c, session.id);
});

// POST: client sends JSON-RPC messages here
app.post('/mcp', async (c) => {
  const sessionId = c.req.query('session');
  if (!sessionId || !getSession(sessionId)) {
    return c.json({ error: 'Invalid or expired session' }, 400);
  }

  const body = await c.req.json();
  await handleMcpRequest(body, sessionId, { env: c.env, db: c.env.DB });
  return c.json({ accepted: true });
});

// === REST API Routes ===

// Mount API routes
app.route('/api/servers', serversApi);
app.route('/api/proxies', proxiesApi);
app.route('/api/verify-server', verifyApi);
app.route('/api/usage', usageApi);
app.route('/api/ai', aiApi);

// === Frontend ===
app.get('/', (c) => {
  return c.html(frontendHtml);
});

app.get('/index.html', (c) => {
  return c.html(frontendHtml);
});

export default app;
