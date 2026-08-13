import type { McpTool } from './index';
import { setServerEnabled } from '../../db/queries';

export const enableServerTool: McpTool = {
  definition: {
    name: 'enable_server',
    description: '启用一台服务器。被禁用的服务器不会出现在 list_servers 等查询结果中，启用后会恢复正常。需要服务器ID。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID。从 list_servers 或 get_server 获取。' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    await setServerEnabled(db, args.server_id as string, true);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, enabled: true }) }] };
  },
};

export const disableServerTool: McpTool = {
  definition: {
    name: 'disable_server',
    description: '禁用一台服务器。禁用后该服务器不会出现在 list_servers、query_servers_by_ability 等MCP工具的返回结果中。用于临时下架服务器进行维护或隔离故障。需要服务器ID。注意：get_server 仍然可以查到被禁用的服务器（会显示 enabled: false）。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID。从 list_servers 或 get_server 获取。' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    await setServerEnabled(db, args.server_id as string, false);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, enabled: false }) }] };
  },
};
