import type { McpTool } from './index';
import { recordUsage } from '../../db/queries';

export const recordUsageTool: McpTool = {
  definition: {
    name: 'record_usage',
    description: '记录Agent调用服务器的日志',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string' },
        agent_id: { type: 'string' },
        session_id: { type: 'string' },
        action: { type: 'string', description: '操作类型: ssh_connect, train, etc.' },
        details: {
          type: 'object',
          properties: {
            gpu_util: { type: 'number' },
            memory_util: { type: 'number' },
            disk_util: { type: 'number' },
          },
        },
      },
      required: ['server_id', 'agent_id', 'session_id', 'action'],
    },
  },
  execute: async (args, { db }) => {
    const id = await recordUsage(db, {
      server_id: args.server_id as string,
      agent_id: args.agent_id as string,
      session_id: args.session_id as string,
      action: args.action as string,
      details: args.details ? JSON.stringify(args.details) : undefined,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ id }) }] };
  },
};
