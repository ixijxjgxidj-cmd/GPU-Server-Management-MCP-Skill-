import type { McpTool } from './index';
import { addServerPitfall, getServerById } from '../../db/queries';

export const recordPitfallTool: McpTool = {
  definition: {
    name: 'record_pitfall',
    description: '记录或沉淀踩坑经验与避坑方案（如 sing-box/v2ray 出海代理排错、PyTorch/CUDA 驱动版本冲突、虚拟内存不足与 OOM 规避、挂载路径与权限陷阱等）。支持针对特定服务器或记录至【🌐 出海代理配置专区 / 全局知识库】。所有记录将永久沉淀并随 get_servers / query_troubleshooting 自动返回给后续所有 Agent，绝不会因服务器下架删除而丢失。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: {
          type: 'string',
          description: '目标服务器 ID（若为通用代理/全局避坑知识，可填写 "global" 或 "proxy"）',
          default: 'global',
        },
        category: {
          type: 'string',
          enum: ['proxy', 'environment', 'hardware', 'network', 'general'],
          description: '分类专区：proxy (🌐 出海代理配置专区) | environment (Python/CUDA环境) | hardware (GPU/磁盘) | network (网络连通) | general (通用)',
        },
        is_global: {
          type: 'boolean',
          description: '是否为永久全局知识（设置为 true 时绝不会随任何服务器删除而消失）',
        },
        title: {
          type: 'string',
          description: '踩坑简述或标题，例如 "sing-box 1.13.18 拒绝 legacy DNS 配置", "CUDA 12.1 与 PyTorch 2.4.0 冲突"',
        },
        description: {
          type: 'string',
          description: '踩坑的详细现象、报错日志或触发条件',
        },
        workaround: {
          type: 'string',
          description: '避坑方案、正确操作步骤或规避指令，例如 "export http_proxy=http://127.0.0.1:10809", "安装 torch==2.3.1+cu121"',
        },
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'critical'],
          default: 'warning',
          description: '严重程度：info (提示) | warning (警告/默认) | critical (致命/严重阻断)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签分类，例如 ["sing-box", "proxy", "dns", "cuda"]',
        },
        agent: {
          type: 'string',
          description: '记录该经验的 Agent 或人员标识，例如 "antigravity", "claude-code"',
        },
      },
      required: ['title', 'description', 'workaround'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = (args.server_id as string) || 'global';
    const title = args.title as string;
    const description = args.description as string;
    const workaround = args.workaround as string;
    const severity = (args.severity as 'info' | 'warning' | 'critical') || 'warning';
    const category = args.category as string | undefined;
    const isGlobal = args.is_global as boolean | undefined;
    const tags = args.tags as string[] | undefined;
    const agent = (args.agent as string) || 'agent';

    if (!title || !description || !workaround) {
      return {
        content: [{ type: 'text', text: '错误：title, description, workaround 均为必填项。' }],
        isError: true,
      };
    }

    let serverName = '🌐 全局代理与通用知识专区';
    let serverHost = 'Global Knowledge Zone';
    if (serverId !== 'global' && serverId !== 'proxy') {
      const server = await getServerById(db, serverId);
      if (server) {
        serverName = server.name;
        serverHost = server.host;
      }
    }

    const pitfall = await addServerPitfall(db, {
      server_id: serverId,
      category,
      is_global: isGlobal,
      title,
      description,
      workaround,
      severity,
      tags,
      agent,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: pitfall.is_global
            ? `✔ 已成功记录至【🌐 出海代理/全局避坑专区】（永久沉淀，不随服务器删除而消失）`
            : `✔ 已成功为服务器 [${serverName}] (${serverHost}) 沉淀踩坑经验`,
          pitfall: {
            id: pitfall.id,
            server_id: serverId,
            category: pitfall.category,
            is_global: pitfall.is_global,
            server_name: serverName,
            title: pitfall.title,
            severity: pitfall.severity,
            workaround: pitfall.workaround,
            created_at: pitfall.created_at,
          },
          note: '该记录已同步至集群集体记忆，后续调用 get_servers / query_troubleshooting 时将自动返回给所有 Agent。',
        }, null, 2),
      }],
    };
  },
};
