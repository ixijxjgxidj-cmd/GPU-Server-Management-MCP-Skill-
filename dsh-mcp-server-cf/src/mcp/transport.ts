import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import type { JsonRpcResponse } from './protocol';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function initSseTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS mcp_sse_sessions (session_id TEXT PRIMARY KEY, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS mcp_sse_queue (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)`),
  ]);
}

export async function handleSseConnection(c: Context): Promise<Response> {
  const db = c.env.DB as D1Database;
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.prepare(`INSERT INTO mcp_sse_sessions (session_id, created_at) VALUES (?, ?)`).bind(sessionId, now).run();
  } catch {
    await initSseTables(db);
    await db.prepare(`INSERT INTO mcp_sse_sessions (session_id, created_at) VALUES (?, ?)`).bind(sessionId, now).run();
  }

  return streamSSE(c, async (stream) => {
    // 1. Send endpoint event
    await stream.writeSSE({
      event: 'endpoint',
      data: `/mcp?session=${sessionId}`,
    });

    // 2. Poll D1 queue for messages
    try {
      while (!stream.aborted) {
        const { results } = await db
          .prepare(`SELECT id, message FROM mcp_sse_queue WHERE session_id = ? ORDER BY rowid ASC`)
          .bind(sessionId)
          .all<{ id: string; message: string }>();

        if (results && results.length > 0) {
          for (const row of results) {
            if (stream.aborted) break;
            await stream.writeSSE({
              event: 'message',
              data: row.message,
            });
            await db.prepare(`DELETE FROM mcp_sse_queue WHERE id = ?`).bind(row.id).run();
          }
        } else {
          await sleep(200);
        }
      }
    } catch (_err) {
      // Disconnect
    } finally {
      await db.prepare(`DELETE FROM mcp_sse_sessions WHERE session_id = ?`).bind(sessionId).run().catch(() => {});
      await db.prepare(`DELETE FROM mcp_sse_queue WHERE session_id = ?`).bind(sessionId).run().catch(() => {});
    }
  });
}

export async function queueSseResponse(db: D1Database, sessionId: string, response: JsonRpcResponse): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const message = JSON.stringify(response);

  try {
    await db
      .prepare(`INSERT INTO mcp_sse_queue (id, session_id, message, created_at) VALUES (?, ?, ?, ?)`)
      .bind(id, sessionId, message, now)
      .run();
  } catch {
    await initSseTables(db);
    await db
      .prepare(`INSERT INTO mcp_sse_queue (id, session_id, message, created_at) VALUES (?, ?, ?, ?)`)
      .bind(id, sessionId, message, now)
      .run();
  }
}
