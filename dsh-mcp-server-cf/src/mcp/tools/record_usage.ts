import type { McpTool } from './index';
import { recordUsage } from '../../db/queries';

export const recordUsageTool: McpTool = {
  definition: {
    name: 'record_usage',
    description: '记录Agent对一台服务器的使用日志。当agent通过SSH连接到服务器执行任务（训练、推理等）后，调用此工具记录使用情况，方便后续审计和统计。server_id 从 list_servers 获取，action 描述操作类型。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '被使用的服务器ID——从 list_servers 返回的 id 字段获取。' },
        agent_id: { type: 'string', description: '执行操作的agent标识。例如 "deepseek-coder-v2" 或用户指定的agent名称。' },
        session_id: { type: 'string', description: '会话ID，用于跟踪同一会话内的多次操作。每次MCP连接会话都会生成一个session ID。' },
        action: { type: 'string', description: '操作类型。例如："ssh_connect"（SSH连接）、"train"（训练）、"inference"（推理）、"file_transfer"（文件传输）、"monitor"（监控）。' },
        details: {
          type: 'object',
          description: '操作详情（可选）。可记录资源使用情况等额外信息。',
          properties: {
            gpu_util: { type: 'number', description: 'GPU利用率百分比（0-100）。' },
            memory_util: { type: 'number', description: '内存利用率百分比（0-100）。' },
            disk_util: { type: 'number', description: '磁盘利用率百分比（0-100）。' },
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
