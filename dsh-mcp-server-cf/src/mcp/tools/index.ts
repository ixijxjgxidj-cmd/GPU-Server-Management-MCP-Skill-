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

import { getServersTool } from './get_servers';
import { upsertServerTool } from './upsert_server';
import { updateServerTool } from './update_server';
import { removeServerTool } from './remove_server';
import { verifyConnectivityTool } from './verify_connectivity';
import { listProxiesTool } from './list_proxies';
import { addProxyTool } from './add_proxy';
import { removeProxyTool } from './remove_proxy';
import { refreshLoadTool } from './refresh_load';
import { planTaskAllocationTool } from './plan_task_allocation';
import { planDiskShareTool } from './plan_disk_share';
import { planNetworkRelayTool } from './plan_network_relay';
import { registerDatasetTool } from './register_dataset';
import { removeDatasetTool } from './remove_dataset';
import { claimServerTool } from './claim_server';
import { releaseServerTool } from './release_server';
import { planServerBackupTool } from './plan_server_backup';
import { queryBackupIndexTool } from './query_backup_index';

export const toolRegistry: McpTool[] = [
  // The one-shot "get servers + how to connect" tool — the primary entry point
  getServersTool,

  // Server management & lifecycle
  claimServerTool,
  releaseServerTool,
  upsertServerTool,
  updateServerTool,
  removeServerTool,
  verifyConnectivityTool,

  // Proxy management
  listProxiesTool,
  addProxyTool,
  removeProxyTool,

  // Multi-server orchestration & backups
  refreshLoadTool,
  planTaskAllocationTool,
  planDiskShareTool,
  planNetworkRelayTool,
  planServerBackupTool,
  queryBackupIndexTool,

  // Dataset Management
  registerDatasetTool,
  removeDatasetTool,
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
