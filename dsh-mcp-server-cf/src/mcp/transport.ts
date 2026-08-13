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

    try {
      // Process queued messages and new ones
      while (true) {
        // Check if client disconnected (SSEStreamingApi.aborted is a boolean)
        if (stream.aborted) break;

        // Send any queued responses (drain queue first)
        while (session.responseQueue.length > 0) {
          if (stream.aborted) break;
          const msg = session.responseQueue.shift()!;
          await stream.writeSSE({
            event: 'message',
            data: JSON.stringify(msg),
          });
        }
        if (stream.aborted) break;

        // If queue is empty, wait for the next response.
        // The resolver Promise is set up. If the client disconnects while waiting,
        // the next writeSSE call will throw, which we catch below.
        if (session.responseQueue.length === 0) {
          const response = await new Promise<JsonRpcResponse>((resolve) => {
            // Wrap in microtask to avoid race between queue check and resolver
            queueMicrotask(() => {
              if (session.responseQueue.length > 0) {
                resolve(session.responseQueue.shift()!);
              } else {
                session.resolver = resolve;
              }
            });
          });

          // writeSSE will throw if client disconnected
          await stream.writeSSE({
            event: 'message',
            data: JSON.stringify(response),
          });
        }
      }
    } catch (_err) {
      // Client disconnected — writeSSE throws when stream is closed
      // Exit loop gracefully
    } finally {
      // Clean up session when connection ends
      removeSession(sessionId);
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
