import type { McpTool } from './index';
import { listServers } from '../../db/queries';
import { renderConnectionMode } from '../../models/server';

export const listServersTool: McpTool = {
  definition: {
    name: 'list_servers',
    description: '列出所有GPU服务器。当你需要知道有哪些可用服务器、查看服务器集群概览、或按标签筛选服务器时使用。返回每个服务器的ID、名称、IP、端口、GPU型号、在线状态和连接方式。输出中的 connection_mode_label 说明该服务器通过V2RayN还是直连访问。',
    inputSchema: {
      type: 'object',
      properties: {
        tag: { type: 'string', description: '可选标签过滤。例如 "training" 只返回标注了训练任务的服务器。标签在添加服务器时通过 tags 参数设置。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const tag = args.tag as string | undefined;
    const servers = await listServers(db, tag);
    const summaries = servers.map(s => ({
      id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      gpu_model: s.gpu_model,
      status_online: s.status_online === 1,
      connection_mode_label: renderConnectionMode({
        v2ray_available: s.v2ray_available === 1,
        direct_when_proxy_available: s.direct_when_proxy_available === 1,
        direct_when_no_proxy: s.direct_when_no_proxy === 1,
      }),
    }));
    return {
      content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }],
    };
  },
};
