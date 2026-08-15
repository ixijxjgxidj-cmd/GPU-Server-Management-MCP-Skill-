import type { McpTool } from './index';
import { addServerPitfall, getServerById } from '../../db/queries';

export const recordPitfallTool: McpTool = {
  definition: {
    name: 'record_pitfall',
    description: '为指定 GPU 服务器记录或沉淀踩坑经验（如 PyTorch/CUDA 驱动版本冲突、虚拟内存不足与 OOM 规避、特定网络/代理阻断、挂载路径与权限陷阱等）。所有记录将永久沉淀并随 get_servers 自动返回给后续所有 Agent，避免团队和 Agent 重复踩坑。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: {
          type: 'string',
          description: '目标服务器 ID',
        },
        title: {
          type: 'string',
          description: '踩坑简述或标题，例如 "CUDA 12.1 与 PyTorch 2.4.0 冲突", "默认 /tmp 分区仅 2GB 易导致缓存爆满"',
        },
        description: {
          type: 'string',
          description: '踩坑的详细现象、报错日志或触发条件',
        },
        workaround: {
          type: 'string',
          description: '避坑方案、正确操作步骤或规避指令，例如 "export TMPDIR=~/workspace/tmp", "安装 torch==2.3.1+cu121"',
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
          description: '标签分类，例如 ["cuda", "oom", "storage", "network"]',
        },
        agent: {
          type: 'string',
          description: '记录该经验的 Agent 或人员标识，例如 "antigravity", "claude-code"',
        },
      },
      required: ['server_id', 'title', 'description', 'workaround'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const title = args.title as string;
    const description = args.description as string;
    const workaround = args.workaround as string;
    const severity = (args.severity as 'info' | 'warning' | 'critical') || 'warning';
    const tags = args.tags as string[] | undefined;
    const agent = (args.agent as string) || 'agent';

    if (!serverId || !title || !description || !workaround) {
      return {
        content: [{ type: 'text', text: '错误：server_id, title, description, workaround 均为必填项。' }],
        isError: true,
      };
    }

    const server = await getServerById(db, serverId);
    if (!server) {
      return {
        content: [{ type: 'text', text: `未找到服务器: ${serverId}` }],
        isError: true,
      };
    }

    const pitfall = await addServerPitfall(db, {
      server_id: serverId,
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
          message: `✔ 已成功为服务器 [${server.name}] (${server.host}) 沉淀踩坑经验`,
          pitfall: {
            id: pitfall.id,
            server_id: serverId,
            server_name: server.name,
            title: pitfall.title,
            severity: pitfall.severity,
            workaround: pitfall.workaround,
            created_at: pitfall.created_at,
          },
          note: '该记录已同步至集群集体记忆，后续调用 get_servers 时将自动随服务器信息返回给所有 Agent。',
        }, null, 2),
      }],
    };
  },
};
