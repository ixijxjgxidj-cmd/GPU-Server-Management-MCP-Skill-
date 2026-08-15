import type { JsonRpcRequest, JsonRpcResponse } from './protocol';
import { MCP_ERROR_CODES } from './protocol';
import type { ToolContext } from './tools/index';
import { toolRegistry, executeTool } from './tools/index';

/**
 * Process a JSON-RPC request and return the response.
 * Supports both SSE transport (caller sends the returned response via sendResponse)
 * and Streamable HTTP transport (caller returns it directly as JSON).
 */
export async function handleMcpRequest(
  request: JsonRpcRequest,
  ctx: ToolContext
): Promise<JsonRpcResponse> {
  if (!request || request.jsonrpc !== '2.0') {
    return makeError(request?.id, MCP_ERROR_CODES.INVALID_REQUEST, 'Must use JSON-RPC 2.0');
  }

  try {
    switch (request.method) {
      case 'initialize':
        return handleInitialize(request);
      case 'tools/list':
        return handleListTools(request);
      case 'tools/call':
        return await handleCallTool(request, ctx);
      default:
        return makeError(request.id, MCP_ERROR_CODES.METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeError(request.id, MCP_ERROR_CODES.INTERNAL_ERROR, msg);
  }
}

function handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
  const params = request.params as { protocolVersion?: string; capabilities?: Record<string, unknown>; clientInfo?: Record<string, unknown> } | undefined;
  const requestedVersion = params?.protocolVersion;
  // Support both the 2024-11-05 (SSE) and 2025-03-26 (Streamable HTTP) spec versions
  const supported = requestedVersion === '2024-11-05' || requestedVersion === '2025-03-26';
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: supported ? requestedVersion! : '2025-03-26',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'dsh-mcp-server',
        version: '0.1.0',
      },
    },
  };
}

function handleListTools(request: JsonRpcRequest): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools: toolRegistry.map(t => ({
        name: t.definition.name,
        description: t.definition.description,
        inputSchema: t.definition.inputSchema,
      })),
    },
  };
}

async function handleCallTool(request: JsonRpcRequest, ctx: ToolContext): Promise<JsonRpcResponse> {
  const params = request.params as { name: string; arguments?: Record<string, unknown> };
  if (!params || !params.name) {
    return makeError(request.id, MCP_ERROR_CODES.INVALID_PARAMS, 'Missing tool name');
  }

  const result = await executeTool(params.name, params.arguments ?? {}, ctx);
  return {
    jsonrpc: '2.0',
    id: request.id,
    result,
  };
}

function makeError(id: number | string | undefined, code: number, message: string): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: { code, message },
  };
}