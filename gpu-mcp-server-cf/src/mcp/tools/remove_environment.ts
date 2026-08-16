import type { McpTool } from './index';

export const removeEnvironmentTool: McpTool = {
  definition: {
    name: 'remove_environment',
    description: '在指定GPU服务器上移除已废弃或已删除的环境记录。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
        name: { type: 'string', description: '待移除的环境名称' },
      },
      required: ['server_id', 'name'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const name = args.name as string;

    const server = await db.prepare('SELECT id, environments FROM servers WHERE id = ?').bind(serverId).first<{ id: string; environments: string | null }>();
    if (!server) {
      return { content: [{ type: 'text', text: `Error: Server ${serverId} not found.` }], isError: true };
    }

    interface EnvItem {
      name: string;
      [k: string]: unknown;
    }

    let envs: EnvItem[] = [];
    if (server.environments) {
      try {
        envs = JSON.parse(server.environments);
      } catch (e) {
        // ignore
      }
    }

    const filtered = envs.filter(e => e.name !== name);
    await db.prepare('UPDATE servers SET environments = ? WHERE id = ?').bind(JSON.stringify(filtered), serverId).run();

    return {
      content: [{ type: 'text', text: `Successfully removed environment '${name}' from server ${serverId}.` }],
    };
  },
};
