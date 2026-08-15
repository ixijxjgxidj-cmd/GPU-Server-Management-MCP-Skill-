import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './db/schema';
import { handleMcpRequest } from './mcp/handler';
import serversApi from './api/servers';
import proxiesApi from './api/proxies';
import verifyApi from './api/verify';
import usageApi from './api/usage';
import aiApi from './api/ai';
import bridgeApi from './api/bridge';
import knowledgeApi from './api/knowledge';
import { HTML as frontendHtml } from './frontend/html';

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend
// TODO: Restrict CORS origin in production. Currently allows all origins.
// Replace with: app.use('*', cors({ origin: 'https://yourdomain.com' }));
app.use('*', cors());

// === MCP Endpoint (Streamable HTTP only) ===

// POST /mcp: Streamable HTTP transport — the only transport that works reliably
// on stateless serverless platforms like Cloudflare Workers.
// Client POSTs JSON-RPC, server returns JSON-RPC response directly.
app.post('/mcp', async (c) => {
  const body = await c.req.json();
  const ctx = { env: c.env, db: c.env.DB };
  const response = await handleMcpRequest(body, ctx);
  return c.json(response);
});

// GET /mcp: Return 405 so MCP clients fall back to Streamable HTTP POST.
// SSE transport is not supported on stateless serverless platforms.
app.get('/mcp', (c) => {
  return c.text('SSE transport is not supported. Use Streamable HTTP (POST).', 405);
});

// === REST API Routes ===

// Mount API routes
app.route('/api/servers', serversApi);
app.route('/api/proxies', proxiesApi);
app.route('/api/verify-server', verifyApi);
app.route('/api/usage', usageApi);
app.route('/api/ai', aiApi);
app.route('/api/bridge', bridgeApi);
app.route('/api/knowledge', knowledgeApi);

// === Frontend ===
app.get('/', (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  return c.html(frontendHtml);
});

app.get('/index.html', (c) => {
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  return c.html(frontendHtml);
});

export default app;
