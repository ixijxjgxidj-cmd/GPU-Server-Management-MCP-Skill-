import { streamSSE, type SSEStreamingApi } from 'hono/streaming';
import type { Context } from 'hono';
import type { JsonRpcResponse } from './protocol';

interface SseSession {
  id: string;
  stream: SSEStreamingApi;
  responseQueue: JsonRpcResponse[];
  resolver: ((msg: JsonRpcResponse) => void) | null;
}

const sessions = new Map<string, SseSession>();

export function createSession(): SseSession {
  const id = crypto.randomUUID();
  const session: SseSession = { id, stream: null as unknown as SSEStreamingApi, responseQueue: [], resolver: null };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): SseSession | undefined {
  return sessions.get(id);
}

export function removeSession(id: string): void {
  sessions.delete(id);
}

export async function handleSseConnection(c: Context, sessionId: string): Promise<Response> {
  const session = getSession(sessionId);
  if (!session) {
    return c.text('Session not found', 404);
  }

  return streamSSE(c, async (stream) => {
    session.stream = stream;

    // Send endpoint event
    await stream.writeSSE({
      event: 'endpoint',
      data: `/mcp?session=${sessionId}`,
    });

    // Process queued messages and new ones
    while (true) {
      // Send any queued responses
      while (session.responseQueue.length > 0) {
        const msg = session.responseQueue.shift()!;
        await stream.writeSSE({
          event: 'message',
          data: JSON.stringify(msg),
        });
      }

      // Wait for new response
      const response = await new Promise<JsonRpcResponse>((resolve) => {
        if (session.responseQueue.length > 0) {
          resolve(session.responseQueue.shift()!);
        } else {
          session.resolver = resolve;
        }
      });

      await stream.writeSSE({
        event: 'message',
        data: JSON.stringify(response),
      });
    }
  });
}

export function sendResponse(sessionId: string, response: JsonRpcResponse): void {
  const session = getSession(sessionId);
  if (!session) return;

  if (session.resolver) {
    const resolve = session.resolver;
    session.resolver = null;
    resolve(response);
  } else {
    session.responseQueue.push(response);
  }
}
