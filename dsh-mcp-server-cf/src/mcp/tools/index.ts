import type { Env } from '../../db/schema';
import type { McpToolDefinition, McpCallToolResult } from '../protocol';

export interface ToolContext {
  env: Env;
  db: D1Database;
}

export interface McpTool {
  definition: McpToolDefinition;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<McpCallToolResult>;
}

import { listServersTool } from './list_servers';
import { getServerTool } from './get_server';
import { addServerTool } from './add_server';
import { updateServerTool } from './update_server';
import { removeServerTool } from './remove_server';
import { queryServersTool } from './query_servers';
import { recordUsageTool } from './record_usage';
import { listProxiesTool } from './list_proxies';
import { addProxyTool } from './add_proxy';
import { removeProxyTool } from './remove_proxy';
import { testProxyTool } from './test_proxy';
import { findBestServerTool } from './find_best_server';
import { verifyConnectivityTool } from './verify_connectivity';
import { getClusterSummaryTool } from './get_cluster_summary';

export const toolRegistry: McpTool[] = [
  // Basic CRUD — servers
  listServersTool,
  getServerTool,
  addServerTool,
  updateServerTool,
  removeServerTool,
  queryServersTool,

  // Basic CRUD — proxies
  listProxiesTool,
  addProxyTool,
  removeProxyTool,

  // Testing and diagnostics
  testProxyTool,
  verifyConnectivityTool,

  // Usage tracking
  recordUsageTool,

  // High-level workflow tools
  findBestServerTool,
  getClusterSummaryTool,
];

export function getTool(name: string): McpTool | undefined {
  return toolRegistry.find(t => t.definition.name === name);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<McpCallToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  return tool.execute(args, ctx);
}
