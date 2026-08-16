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
import { registerEnvironmentTool } from './register_environment';
import { removeEnvironmentTool } from './remove_environment';
import { claimServerTool } from './claim_server';
import { releaseServerTool } from './release_server';
import { planServerBackupTool } from './plan_server_backup';
import { queryBackupIndexTool } from './query_backup_index';
import { importProxySubscriptionTool } from './import_proxy_subscription';
import { recordPitfallTool } from './record_pitfall';
import { removePitfallTool } from './remove_pitfall';
import { queryTroubleshootingTool } from './query_troubleshooting';
import { listGDriveFilesTool } from './list_gdrive_files';

export const toolRegistry: McpTool[] = [
  // The one-shot "get servers + how to connect" tool — the primary entry point
  getServersTool,

  // Troubleshooting & RAG Collective Knowledge Base (遇到问题优先查询)
  queryTroubleshootingTool,

  // Server management & lifecycle
  claimServerTool,
  releaseServerTool,
  upsertServerTool,
  updateServerTool,
  removeServerTool,
  verifyConnectivityTool,

  // Pitfalls & Lessons Learned (踩坑沉淀与避坑)
  recordPitfallTool,
  removePitfallTool,

  // Proxy & Subscription management
  listProxiesTool,
  addProxyTool,
  removeProxyTool,
  importProxySubscriptionTool,

  // Multi-server orchestration & backups
  refreshLoadTool,
  planTaskAllocationTool,
  planDiskShareTool,
  planNetworkRelayTool,
  planServerBackupTool,
  queryBackupIndexTool,

  // Google Drive cloud storage
  listGDriveFilesTool,

  // Dataset & Environment Collective Memory
  registerDatasetTool,
  removeDatasetTool,
  registerEnvironmentTool,
  removeEnvironmentTool,
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
