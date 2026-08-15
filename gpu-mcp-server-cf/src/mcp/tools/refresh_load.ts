import type { McpTool } from './index';
import { queryServersByAbility } from '../../db/queries';

const PROBE_COMMANDS = {
  gpu_util_pct: "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | awk '{s+=$1;n++} END{print (n?int(s/n):0)}'",
  gpu_mem_free_gb: "nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits | awk '{s+=$1} END{print int(s/1024)}'",
  ram_free_gb: "free -g | awk '/^Mem:/{print $7}'",
  disk_free_gb: 'df -BG / | awk \'NR==2{gsub(/G/,"",$4); print $4}\'',
  running_tasks: "nvidia-smi --query-compute-apps=pid --format=csv,noheader | wc -l",
};

export const refreshLoadTool: McpTool = {
  definition: {
    name: 'refresh_load',
    description: '获取各服务器的负载探测命令包,用于agent并发SSH执行后用 upsert_server 回写实时负载(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),实现负载均衡的B(实时)路径。不传参则针对所有在线服务器。',
    inputSchema: {
      type: 'object',
      properties: {
        server_ids: { type: 'array', items: { type: 'string' }, description: '只探测这些服务器(可选)。' },
        gpu_model: { type: 'string', description: '按GPU型号过滤(可选)。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids as string[] | undefined;
    const gpuModel = args.gpu_model as string | undefined;
    let servers = await queryServersByAbility(db, { gpu_model: gpuModel, status_online: true });
    if (serverIds && serverIds.length > 0) {
      const set = new Set(serverIds);
      servers = servers.filter(s => set.has(s.id));
    }
    const targets = servers.map(s => ({
      server_id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username,
      auth_method: s.auth_method,
      key_path: s.key_path,
      key_content_b64: s.key_content ? btoa(s.key_content) : null,
      password: s.password,
      probe_commands: PROBE_COMMANDS,
    }));
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          how_to: '对每台并发SSH执行 probe_commands,把结果用 upsert_server 回写(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),然后 get_servers 或 plan_task_allocation 读最新快照。密钥用 key_content_b64 解码: echo <b64> | base64 -d > /tmp/dsh_<id> && chmod 600。',
          count: targets.length,
          targets,
        }),
      }],
    };
  },
};
