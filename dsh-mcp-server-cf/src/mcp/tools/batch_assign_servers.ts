import type { McpTool } from './index';
import { getServerById, updateServer } from '../../db/queries';

export const batchAssignServersTool: McpTool = {
  definition: {
    name: 'batch_assign_servers',
    description: '批量为一组服务器分配任务标签或更新配置。在分布式任务编排场景中使用——当你从 batch_query_servers 选出了一批服务器后，可以用此工具为它们统一标记任务标签（如 "training-job-42"），或者批量修改连接配置。每台服务器的操作结果单独返回，部分失败不影响其他服务器。',
    inputSchema: {
      type: 'object',
      properties: {
        server_ids: {
          type: 'array',
          items: { type: 'string' },
          description: '要操作的服务器ID列表。从 list_servers 或 batch_query_servers 返回的 id 字段获取。',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '要设置的标签列表。会**替换**服务器现有的所有标签。例如 ["training", "job-42", "in-use"]。如果只想追加而不是替换，使用 append_tags。',
        },
        append_tags: {
          type: 'array',
          items: { type: 'string' },
          description: '要追加的标签列表。会合并到服务器现有标签中，不会覆盖已有标签。例如 ["job-42"] 会添加到现有标签后面。',
        },
        clear_tags: { type: 'boolean', default: false, description: '是否清空所有标签。设为 true 会清空后再设置 tags 或 append_tags。' },
        updates: {
          type: 'object',
          description: '要更新的其他配置字段（可选）。所有服务器统一设置相同的值。可用字段：default_proxy_id, v2ray_available, direct_when_proxy_available, direct_when_no_proxy。注意连接相关的字段在所有服务器上统一设置。',
          properties: {
            default_proxy_id: { type: 'string', description: '设置默认代理ID。' },
            v2ray_available: { type: 'boolean' },
            direct_when_proxy_available: { type: 'boolean' },
            direct_when_no_proxy: { type: 'boolean' },
          },
        },
      },
      required: ['server_ids'],
    },
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids as string[];
    if (!serverIds || serverIds.length === 0) {
      return { content: [{ type: 'text', text: '请提供至少一个 server_id' }], isError: true };
    }

    const newTags = args.tags as string[] | undefined;
    const appendTags = args.append_tags as string[] | undefined;
    const clearTags = args.clear_tags === true;
    const updates = args.updates as Record<string, unknown> | undefined;

    // Process each server
    const results: Array<{
      server_id: string;
      name?: string;
      success: boolean;
      error?: string;
      final_tags?: string[];
    }> = [];

    for (const serverId of serverIds) {
      try {
        const server = await getServerById(db, serverId);
        if (!server) {
          results.push({ server_id: serverId, success: false, error: '服务器未找到' });
          continue;
        }

        // Build the updates payload
        const effectiveUpdates: Record<string, unknown> = {};

        // Handle tags
        let currentTags: string[] = [];
        if (server.tags) {
          try { currentTags = JSON.parse(server.tags); } catch { currentTags = []; }
        }
        if (clearTags) currentTags = [];
        if (newTags) currentTags = [...newTags];
        if (appendTags) {
          for (const t of appendTags) {
            if (!currentTags.includes(t)) currentTags.push(t);
          }
        }
        if (newTags || appendTags || clearTags) {
          effectiveUpdates.tags = JSON.stringify(currentTags);
        }

        // Apply other updates
        if (updates) {
          if (updates.default_proxy_id !== undefined) effectiveUpdates.default_proxy_id = updates.default_proxy_id;
          if (updates.v2ray_available !== undefined) effectiveUpdates.v2ray_available = updates.v2ray_available ? 1 : 0;
          if (updates.direct_when_proxy_available !== undefined) effectiveUpdates.direct_when_proxy_available = updates.direct_when_proxy_available ? 1 : 0;
          if (updates.direct_when_no_proxy !== undefined) effectiveUpdates.direct_when_no_proxy = updates.direct_when_no_proxy ? 1 : 0;
        }

        if (Object.keys(effectiveUpdates).length === 0) {
          results.push({ server_id: serverId, name: server.name, success: true, final_tags: currentTags });
          continue;
        }

        const ok = await updateServer(db, serverId, effectiveUpdates);
        results.push({
          server_id: serverId,
          name: server.name,
          success: ok,
          error: ok ? undefined : '更新失败',
          final_tags: currentTags,
        });
      } catch (err) {
        results.push({
          server_id: serverId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: `成功更新 ${successCount}/${serverIds.length} 台服务器`,
          total: serverIds.length,
          success_count: successCount,
          fail_count: serverIds.length - successCount,
          results,
        }, null, 2),
      }],
    };
  },
};
