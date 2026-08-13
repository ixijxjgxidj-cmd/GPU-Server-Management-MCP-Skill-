import type { McpTool } from './index';
import { getServerById, updateServer } from '../../db/queries';

export const detectHardwareTool: McpTool = {
  definition: {
    name: 'detect_server_hardware',
    description: '更新服务器的硬件检测结果。Agent SSH 进入服务器后运行检测命令，将结果通过此工具存回数据库。首次添加服务器后和定期刷新时使用。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
        gpu_model: { type: 'string', description: 'GPU型号，如 "NVIDIA A100 80GB PCIe"。通过 nvidia-smi --query-gpu=name --format=csv,noheader 获取' },
        gpu_count: { type: 'number', description: 'GPU数量。通过 nvidia-smi --query-gpu=count --format=csv,noheader 或 lspci | grep -i nvidia | wc -l 获取' },
        gpu_memory_gb: { type: 'number', description: '单卡显存(GB)。通过 nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 获取，取第一块卡的值' },
        cpu_cores: { type: 'number', description: 'CPU总核心数。通过 nproc 或 lscpu | grep "^CPU(s):" | awk "{print $2}" 获取' },
        ram_gb: { type: 'number', description: '内存总量(GB)。通过 free -g | awk "/^Mem:/{print $2}" 或 awk "/MemTotal/{printf \"%.0f\", $2/1024/1024}" /proc/meminfo 获取' },
        disk_gb: { type: 'number', description: '磁盘总量(GB)。通过 df -BG / | awk "NR==2{print $2}" | sed "s/G//" 获取' },
      },
      required: ['server_id'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const server = await getServerById(db, serverId);
    if (!server) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Server not found' }) }], isError: true };
    }

    const updates: Record<string, unknown> = {};
    if (args.gpu_model) updates.gpu_model = args.gpu_model as string;
    if (args.gpu_memory_gb !== undefined) updates.gpu_memory_gb = args.gpu_memory_gb as number;
    if (args.cpu_cores !== undefined) updates.cpu_cores = args.cpu_cores as number;
    if (args.ram_gb !== undefined) updates.ram_gb = args.ram_gb as number;
    if (args.disk_gb !== undefined) updates.disk_gb = args.disk_gb as number;

    // If gpu_count is provided but gpu_model isn't, infer model
    if (!args.gpu_model && args.gpu_count) {
      const gpuCount = args.gpu_count as number;
      if (gpuCount > 0) updates.gpu_model = `${gpuCount}x GPU`;
    }

    await updateServer(db, serverId, updates);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          server_id: serverId,
          detected: updates,
        }, null, 2),
      }],
    };
  },
};
