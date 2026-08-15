import type { McpTool } from './index';
import { releaseServerTask, recordUsage } from '../../db/queries';

export const releaseServerTool: McpTool = {
  definition: {
    name: 'release_server',
    description: '在服务器上声明释放占用(任务结束时主动调用)。清除占用状态并将服务器标记为空闲，供后续任务分配。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID (来自 get_servers)' },
        agent: { type: 'string', description: '释放该任务的 Agent 标识' },
        task_done: { type: 'boolean', description: '任务是否成功完成，默认 true', default: true },
        note: { type: 'string', description: '任务完成说明或产物路径（可选）' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const agent = (args.agent as string) || 'unknown';
    const taskDone = args.task_done !== false;
    const note = (args.note as string) || '';

    await releaseServerTask(db, serverId);
    await recordUsage(db, {
      server_id: serverId,
      agent_id: agent,
      session_id: 'mcp',
      action: 'release_task',
      details: JSON.stringify({ task_done: taskDone, note, released_at: new Date().toISOString() }),
    });

    return {
      content: [{
        type: 'text',
        text: `Successfully released server ${serverId}. Server is now idle.`,
      }],
    };
  },
};
