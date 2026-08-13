import type { McpTool } from './index';
import { getServerById, releaseServerTask } from '../../db/queries';

export const releaseServerTool: McpTool = {
  definition: {
    name: 'release_server',
    description: '释放一台服务器——清除"正在使用"标记。在agent完成服务器上的工作后调用，这样其他agent就能看到服务器空闲了。只有服务器当前的占用者（current_agent）可以释放如果是其他人占用的会给出警告但还是可以释放。通常 task_done 设为 true 表示任务已完成正常释放。server_id 从 list_servers 获取。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '要释放的服务器ID——从 list_servers 返回的 id 字段获取。' },
        task_done: { type: 'boolean', default: true, description: '任务是否完成。设为 true 表示正常结束，false 表示中断/取消。' },
        note: { type: 'string', description: '释放说明（可选）。例如 "training completed 100 epochs" 或 "task cancelled by user"。' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const taskDone = args.task_done !== false;
    const note = args.note as string | undefined;

    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: 'text', text: `服务器未找到: ${serverId}` }], isError: true };
    }

    const wasBusy = server.current_agent !== null;
    const previousAgent = server.current_agent;
    const previousTask = server.current_task;

    await releaseServerTask(db, serverId);

    const result: Record<string, unknown> = {
      success: true,
      server_id: serverId,
      server_name: server.name,
      was_busy: wasBusy,
      previous_agent: previousAgent,
      previous_task: previousTask,
      task_done: taskDone,
      message: wasBusy
        ? `✅ ${server.name} 已释放（${previousAgent} 的 "${previousTask}"）`
        : `✅ ${server.name} 已经是空闲状态`,
    };
    if (note) result.note = note;

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
};
