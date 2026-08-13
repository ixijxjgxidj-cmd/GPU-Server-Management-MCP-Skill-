import type { McpTool } from './index';
import { getServerById, updateServerTask } from '../../db/queries';

export const claimServerTool: McpTool = {
  definition: {
    name: 'claim_server',
    description: '将一台服务器标记为"正在使用"，记录由哪个agent在执行什么任务。在agent即将通过SSH连接到服务器开始工作前调用。这会让其他agent知道这台服务器已经被占用。参数 server_id 从 list_servers 获取，agent 通常设为当前agent标识，task 描述具体任务内容（如 "training-llama-3.1"、"inference-api"）。不阻塞其他agent使用——只是一个标记，其他agent仍可通过负载等其他因素决定是否复用。请先调 get_server 看服务器是否已经有任务在跑。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '要标记为正在使用的服务器ID——从 list_servers 返回的 id 字段获取。' },
        agent: { type: 'string', description: '使用服务器的agent标识。例如当前agent的标识名、用户名如 "deepseek-coder"、"user-abc"。' },
        task: { type: 'string', description: '正在执行的任务描述。例如 "train-llama-3.1-70b"、"inference-api-serving"、"data-preprocessing"。建议用简短描述，便于其他agent在列表中快速理解。' },
      },
      required: ['server_id', 'agent', 'task'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const agent = args.agent as string;
    const task = args.task as string;

    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: 'text', text: `服务器未找到: ${serverId}` }], isError: true };
    }

    await updateServerTask(db, serverId, { agent, task });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          server_id: serverId,
          server_name: server.name,
          claimed_by: agent,
          task,
          message: `✅ ${server.name} 已标记：${agent} → ${task}`,
        }, null, 2),
      }],
    };
  },
};
