import type { McpTool } from './index';

export const registerDatasetTool: McpTool = {
  definition: {
    name: 'register_dataset',
    description: '在指定服务器上注册一个已存在的数据集(Dataset Affinity)。这有助于后续在 plan_task_allocation 中实现数据局部性亲和。当Agent下载完数据或挂载了网络盘后调用。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
        name: { type: 'string', description: '数据集的简短名称, e.g. "imagenet-1k"' },
        path: { type: 'string', description: '数据集在服务器上的绝对路径, e.g. "/data/imagenet-1k"' },
        size_gb: { type: 'number', description: '数据集的大小(GB)' },
      },
      required: ['server_id', 'name', 'path'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const name = args.name as string;
    const path = args.path as string;
    const sizeGb = (args.size_gb as number) || 0;

    // Fetch existing datasets
    const server = await db.prepare('SELECT id, datasets FROM servers WHERE id = ?').bind(serverId).first<{id: string, datasets: string | null}>();
    if (!server) {
      return { content: [{ type: 'text', text: `Error: Server ${serverId} not found.` }], isError: true };
    }

    let datasets: { name: string; path: string; size_gb?: number }[] = [];
    if (server.datasets) {
      try {
        datasets = JSON.parse(server.datasets);
      } catch (e) {
        // ignore JSON parse error
      }
    }

    // Upsert dataset
    const existingIndex = datasets.findIndex(d => d.name === name);
    if (existingIndex >= 0) {
      datasets[existingIndex] = { name, path, size_gb: sizeGb };
    } else {
      datasets.push({ name, path, size_gb: sizeGb });
    }

    await db.prepare('UPDATE servers SET datasets = ? WHERE id = ?').bind(JSON.stringify(datasets), serverId).run();

    return {
      content: [{ type: 'text', text: `Successfully registered dataset '${name}' on server ${serverId}.` }],
    };
  },
};
