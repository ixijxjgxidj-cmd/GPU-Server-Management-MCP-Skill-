import type { McpTool } from './index';
import { searchBackupIndexesRAG, listBackupIndexes } from '../../db/queries';

export const queryBackupIndexTool: McpTool = {
  definition: {
    name: 'query_backup_index',
    description: '使用自然语言语义与关键词（RAG 检索）查询全集群的历史备份索引。可快速定位模型权重、训练检查点及产物所在的云盘路径、对端中转服务器 IP 或本地路径。所有索引以源机 IP 为唯一生命周期计量（若源机被删除，索引自动销毁）。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '自然语言或关键词查询，如 "qwen 7b lora checkpoint", "loss 0.18", "阶段性产物"' },
        backup_type: {
          type: 'string',
          enum: ['google_drive', 'peer_server', 'local_weights'],
          description: '可选：按备份类型过滤 (google_drive / peer_server / local_weights)'
        },
        server_host: { type: 'string', description: '可选：按源服务器 IP / 主机过滤' },
        limit: { type: 'number', description: '返回结果数量限制 (默认 5)' },
      },
      required: ['query'],
    },
  },
  execute: async (args, { db }) => {
    const query = (args.query as string) || '';
    const backupType = args.backup_type as string | undefined;
    const serverHost = args.server_host as string | undefined;
    const limit = (args.limit as number) || 5;

    let results = await searchBackupIndexesRAG(db, query, limit * 2);

    if (backupType) {
      results = results.filter(r => r.backup_type === backupType);
    }
    if (serverHost) {
      results = results.filter(r => r.server_host === serverHost || r.peer_server_host === serverHost);
    }
    results = results.slice(0, limit);

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `🔍 未找到与 "${query}" 相关的备份索引记录。提示：请确认源机未被删除（若源机已删除，其名下的备份索引会自动随之销毁）。`,
        }],
      };
    }

    const typeIcons: Record<string, string> = {
      google_drive: '☁️ Google Drive 全量备份',
      peer_server: '🔄 集群对端中转存储',
      local_weights: '📥 本地私有核心产物',
    };

    let md = `## 🔍 备份索引 RAG 检索结果 (共找到 ${results.length} 条相关记录)\n\n`;

    results.forEach((item, idx) => {
      const typeLabel = typeIcons[item.backup_type] || item.backup_type;
      md += `### ${idx + 1}. [${typeLabel}] ${item.summary} (匹配度得分: ${item.score})\n`;
      md += `- **源服务器 IP**: \`${item.server_host}\`\n`;
      md += `- **任务会话**: \`${item.session_name}\`\n`;
      md += `- **存储路径 / 目录**: \`${item.remote_path}\`\n`;
      if (item.peer_server_host) {
        md += `- **对端存储节点 IP**: \`${item.peer_server_host}\`\n`;
      }
      if (item.peer_connect_cmd) {
        md += `- **直连获取指令**: \`${item.peer_connect_cmd}\`\n`;
      }
      if (item.purpose) {
        md += `- **数据用途**: ${item.purpose}\n`;
      }
      if (item.usage_status) {
        md += `- **使用状态**: ${item.usage_status}\n`;
      }
      if (item.relevance_reasons && item.relevance_reasons.length > 0) {
        md += `- **匹配依据**: ${item.relevance_reasons.join(', ')}\n`;
      }
      md += `- **备份时间**: ${item.created_at}\n\n`;
    });

    md += `> 💡 **使用指引**：若目标数据在对端中转服务器，可在 \`plan_task_allocation\` 中直接调度至 \`${results[0].peer_server_host || results[0].server_host}\`；若在 Google Drive 则直接挂载提取；若在本地则可直接调用本地权重。`;

    return {
      content: [{
        type: 'text',
        text: md,
      }],
    };
  },
};
