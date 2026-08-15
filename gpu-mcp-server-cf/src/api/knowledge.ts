import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { searchTroubleshootingKnowledgeRAG } from '../db/queries';

const app = new Hono<{ Bindings: Env }>();

// GET /api/knowledge/search?q=...&category=...&server_id=...&limit=...
app.get('/search', async (c) => {
  const q = c.req.query('q') || '';
  const category = (c.req.query('category') as 'all' | 'pitfall' | 'note' | 'backup') || 'all';
  const serverId = c.req.query('server_id') || undefined;
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20;

  const results = await searchTroubleshootingKnowledgeRAG(c.env.DB, q, {
    serverId,
    category,
    limit,
  });

  return c.json(results);
});

export default app;
