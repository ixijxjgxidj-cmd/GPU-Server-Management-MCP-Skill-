import type { McpTool } from './index';
import { searchTroubleshootingKnowledgeRAG } from '../../db/queries';

export const queryTroubleshootingTool: McpTool = {
  definition: {
    name: 'query_troubleshooting',
    description: '【遇错优先查询】集群故障排查与 RAG 问题知识库检索工具。当在 GPU 服务器上遇到任何报错、安装失败、CUDA/OOM、网络代理异常、驱动库冲突或未知问题时，必须优先调用本工具检索集体记忆库。系统将跨服务器聚合所有踩坑经验 (server_pitfalls)、运维配置备忘 (notes) 与备份索引，秒级返回已验证的解决方案与具体避坑执行命令。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '遇到的错误信息、现象描述、报错日志、关键词或问题（例如 "CUDA out of memory", "PyTorch 驱动冲突", "HuggingFace 下载超时", "NCCL 通信超时", "连接被拒绝", "pip install 失败"）',
        },
        server_id: {
          type: 'string',
          description: '可选：指定特定服务器 ID 过滤。留空则在全集群所有机器的集体记忆中跨机检索',
        },
        category: {
          type: 'string',
          enum: ['all', 'pitfall', 'note', 'backup'],
          default: 'all',
          description: '检索类别：all (全量/默认) | pitfall (专属踩坑经验) | note (服务器运维备忘) | backup (历史实验产出与数据集)',
        },
        limit: {
          type: 'number',
          default: 8,
          description: '返回的最大匹配条数，默认 8 条',
        },
      },
      required: ['query'],
    },
  },
  execute: async (args, { db }) => {
    const query = (args.query as string) || '';
    const serverId = args.server_id as string | undefined;
    const category = (args.category as 'all' | 'pitfall' | 'note' | 'backup') || 'all';
    const limit = typeof args.limit === 'number' ? args.limit : 8;

    if (!query.trim()) {
      return {
        content: [{ type: 'text', text: '错误：query 不能为空，请输入报错日志、现象描述或排错关键词。' }],
        isError: true,
      };
    }

    const results = await searchTroubleshootingKnowledgeRAG(db, query, {
      serverId,
      category,
      limit,
    });

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            total_matches: 0,
            message: `未在集群 RAG 知识库中检索到与 "${query}" 直接匹配的历史踩坑记录。`,
            advice: '建议进行网络检索或排查。在您解决该问题后，请务必立即调用 record_pitfall { server_id, title, description, workaround } 将避坑方案录入知识库，沉淀进集体记忆！',
          }, null, 2),
        }],
      };
    }

    const formatted = results.map((r, idx) => ({
      rank: idx + 1,
      id: r.id,
      type: r.source_type === 'pitfall' ? '⚠️ 踩坑避坑指南' : (r.source_type === 'server_remark' || r.source_type === 'server_topic_note' ? '📝 服务器运维备忘' : '📦 实验备份'),
      severity: r.severity || 'warning',
      server: {
        id: r.server_id,
        name: r.server_name,
        host: r.server_host,
      },
      title: r.title,
      phenomenon_or_issue: r.problem_summary,
      proven_workaround_or_solution: r.workaround_or_content,
      tags: r.tags,
      relevance_score: r.score,
      relevance_reasons: r.relevance_reasons,
      author: r.agent || 'unknown',
      recorded_at: r.created_at,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          total_matches: results.length,
          best_match: formatted[0],
          all_results: formatted,
          instruction: '请优先参考匹配度最高条目的 proven_workaround_or_solution 解决方案及命令直接执行；若问题排查解决后发现新细节，请调用 record_pitfall 进行补充。',
        }, null, 2),
      }],
    };
  },
};
