import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './db/schema';
import { handleMcpRequest } from './mcp/handler';
import { createSession, handleSseConnection, getSession, removeSession, sendResponse } from './mcp/transport';
import serversApi from './api/servers';
import proxiesApi from './api/proxies';
import verifyApi from './api/verify';
import usageApi from './api/usage';
import aiApi from './api/ai';
import bridgeApi from './api/bridge';
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
// Supports both SSE transport (?session=xxx) and Streamable HTTP transport (direct POST)
app.post('/mcp', async (c) => {
  const body = await c.req.json();
  const ctx = { env: c.env, db: c.env.DB };

  // Determine mode: session query param = SSE mode, else Streamable HTTP
  const sessionId = c.req.query('session') || c.req.header('Mcp-Session-Id');
  if (sessionId && getSession(sessionId)) {
    // SSE mode: send response via the SSE stream
    const response = await handleMcpRequest(body, ctx);
    sendResponse(sessionId, response);
    return c.json({ accepted: true });
  }

  // Streamable HTTP mode: process and return the response directly
  const response = await handleMcpRequest(body, ctx);

  // For initialize, set a session header so the client can reuse it
  if (body?.method === 'initialize') {
    const newSession = createSession();
    c.header('Mcp-Session-Id', newSession.id);
  }

  return c.json(response);
});

// === REST API Routes ===

// Mount API routes
app.route('/api/servers', serversApi);
app.route('/api/proxies', proxiesApi);
app.route('/api/verify-server', verifyApi);
app.route('/api/usage', usageApi);
app.route('/api/ai', aiApi);
app.route('/api/bridge', bridgeApi);

// === Frontend ===
app.get('/', (c) => {
  return c.html(frontendHtml);
});

app.get('/index.html', (c) => {
  return c.html(frontendHtml);
});

export default app;
