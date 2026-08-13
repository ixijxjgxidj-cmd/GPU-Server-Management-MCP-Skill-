import type { JsonRpcRequest, JsonRpcResponse } from './protocol';
import { MCP_ERROR_CODES } from './protocol';
import { sendResponse } from './transport';
import type { ToolContext } from './tools/index';
import { toolRegistry, executeTool } from './tools/index';

export async function handleMcpRequest(
  request: JsonRpcRequest,
  sessionId: string,
  ctx: ToolContext
): Promise<void> {
  if (request.jsonrpc !== '2.0') {
    sendResponse(sessionId, makeError(request.id, MCP_ERROR_CODES.INVALID_REQUEST, 'Must use JSON-RPC 2.0'));
    return;
  }

  try {
    switch (request.method) {
      case 'initialize':
        handleInitialize(request, sessionId);
        break;
      case 'tools/list':
        handleListTools(request, sessionId);
        break;
      case 'tools/call':
        await handleCallTool(request, sessionId, ctx);
        break;
      default:
        sendResponse(sessionId, makeError(request.id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method: ${request.method}`));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendResponse(sessionId, makeError(request.id, MCP_ERROR_CODES.INTERNAL_ERROR, msg));
  }
}

function handleInitialize(request: JsonRpcRequest, sessionId: string): void {
  sendResponse(sessionId, {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'dsh-mcp-server',
        version: '0.1.0',
      },
    },
  });
}

function handleListTools(request: JsonRpcRequest, sessionId: string): void {
  sendResponse(sessionId, {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: toolRegistry.map(t => ({
        name: t.definition.name,
        description: t.definition.description,
        inputSchema: t.definition.inputSchema,
      })),
    },
  });
}

async function handleCallTool(request: JsonRpcRequest, sessionId: string, ctx: ToolContext): Promise<void> {
  const params = request.params as { name: string; arguments?: Record<string, unknown> };
  if (!params || !params.name) {
    sendResponse(sessionId, makeError(request.id, MCP_ERROR_CODES.INVALID_PARAMS, 'Missing tool name'));
    return;
  }

  const result = await executeTool(params.name, params.arguments ?? {}, ctx);
  sendResponse(sessionId, {
    jsonrpc: '2.0',
    id: request.id,
    result,
  });
}

function makeError(id: number | string, code: number, message: string): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message },
  };
}
