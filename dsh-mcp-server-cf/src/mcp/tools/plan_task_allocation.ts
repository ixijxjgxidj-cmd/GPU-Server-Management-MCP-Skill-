import type { McpTool } from './index';
import type { TaskSpec, ServerCapacity } from '../../orchestration/types';
import { queryServersByAbility } from '../../db/queries';
import { resolveCapacity, loadAgeSec } from '../../orchestration/load';
import { allocateTasks } from '../../orchestration/pack';

export const planTaskAllocationTool: McpTool = {
  definition: {
    name: 'plan_task_allocation',
    description: '把多个任务按多维约束(GPU数/显存/内存/磁盘/CPU)装箱分配到当前空闲的服务器,返回推荐分配表+排序候选+无法分配项。负载数据优先用实时快照,缺失回退静态规格并标记stale。8个训练任务排队多机分布时用此工具。',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: '任务列表,每个含id和可选约束。',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              gpu_count: { type: 'number' },
              min_gpu_memory_gb: { type: 'number' },
              min_ram_gb: { type: 'number' },
              min_disk_gb: { type: 'number' },
              min_cpu_cores: { type: 'number' },
            },
            required: ['id'],
          },
        },
        exclude_stale_load_sec: { type: 'number', description: '负载数据超过N秒视为陈旧(仅告警,不阻断)。默认300。' },
      },
      required: ['tasks'],
    },
  },
  execute: async (args, { db }) => {
    const tasks = (args.tasks as TaskSpec[]) ?? [];
    const staleLimit = (args.exclude_stale_load_sec as number) ?? 300;
    const now = new Date().toISOString();
    const dbServers = await queryServersByAbility(db, { status_online: true });
    const capacities: ServerCapacity[] = dbServers.map(s => resolveCapacity(s, now));
    const result = allocateTasks(tasks, capacities);
    const stale_warnings = dbServers
      .map(s => ({ server_id: s.id, load_age_sec: loadAgeSec(s, now) }))
      .filter(x => x.load_age_sec === null || x.load_age_sec > staleLimit);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ...result,
          stale_warnings,
          how_to: '照 recommended_allocation 执行;要换机用 candidates_per_task;负载陈旧先 refresh_load 再重算。',
        }),
      }],
    };
  },
};
