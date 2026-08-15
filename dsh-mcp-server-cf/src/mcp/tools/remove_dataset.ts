import type { McpTool } from './index';

export const removeDatasetTool: McpTool = {
  definition: {
    name: 'remove_dataset',
    description: '从服务器的数据集列表中移除某个数据集。当Agent删除了本地数据或解除了挂载后调用。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
        name: { type: 'string', description: '要移除的数据集名称' },
      },
      required: ['server_id', 'name'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const name = args.name as string;

    const server = await db.prepare('SELECT id, datasets FROM servers WHERE id = ?').bind(serverId).first<{id: string, datasets: string | null}>();
    if (!server) {
      return { content: [{ type: 'text', text: `Error: Server ${serverId} not found.` }], isError: true };
    }

    if (!server.datasets) {
      return { content: [{ type: 'text', text: `Dataset '${name}' not found on server.` }] };
    }

    let datasets: { name: string; path: string; size_gb?: number }[] = [];
    try {
      datasets = JSON.parse(server.datasets);
    } catch (e) {
      // ignore
    }

    const filtered = datasets.filter(d => d.name !== name);
    await db.prepare('UPDATE servers SET datasets = ? WHERE id = ?').bind(JSON.stringify(filtered), serverId).run();

    return {
      content: [{ type: 'text', text: `Successfully removed dataset '${name}' from server ${serverId}.` }],
    };
  },
};
