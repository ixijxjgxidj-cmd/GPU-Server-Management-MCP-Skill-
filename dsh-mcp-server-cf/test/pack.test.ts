import { describe, it, expect } from 'vitest';
import { allocateTasks } from '../src/orchestration/pack';
import type { TaskSpec, ServerCapacity } from '../src/orchestration/types';

function srv(id: string, over: Partial<ServerCapacity> = {}): ServerCapacity {
  return { server_id: id, name: id, gpu_count: 4, gpu_mem_gb: 320, ram_gb: 512, disk_gb: 2000, cpu_cores: 64, stale: false, ...over };
}

describe('allocateTasks', () => {
  it('packs descending into first-fit and deducts capacity', () => {
    const tasks: TaskSpec[] = [
      { id: 'big', gpu_count: 2, min_gpu_memory_gb: 40, min_ram_gb: 128, min_disk_gb: 200, min_cpu_cores: 16 },
      { id: 'small', gpu_count: 1 },
    ];
    const servers = [srv('A', { gpu_count: 4, gpu_mem_gb: 320, ram_gb: 512, disk_gb: 2000, cpu_cores: 64 })];
    const r = allocateTasks(tasks, servers);
    expect(r.recommended_allocation).toHaveLength(2);
    expect(r.recommended_allocation[0]).toMatchObject({ task_id: 'big', server_id: 'A' });
    expect(r.recommended_allocation[1]).toMatchObject({ task_id: 'small', server_id: 'A' });
    expect(r.unassignable).toEqual([]);
  });

  it('marks unassignable when no server has enough cards', () => {
    const tasks: TaskSpec[] = [{ id: 'huge', gpu_count: 8 }];
    const servers = [srv('A', { gpu_count: 4 })];
    const r = allocateTasks(tasks, servers);
    expect(r.recommended_allocation).toEqual([]);
    expect(r.unassignable[0]).toMatchObject({ task_id: 'huge' });
    expect(r.unassignable[0].reason).toMatch(/8.*GPU|card/i);
  });

  it('enforces all dimensions: fails on RAM even if GPUs free', () => {
    const tasks: TaskSpec[] = [{ id: 't', gpu_count: 1, min_ram_gb: 1000 }];
    const servers = [srv('A', { gpu_count: 4, ram_gb: 512 })];
    const r = allocateTasks(tasks, servers);
    expect(r.recommended_allocation).toEqual([]);
    expect(r.unassignable[0].reason).toMatch(/RAM|ram/i);
  });

  it('fills candidate list ranked by free capacity for each task', () => {
    const tasks: TaskSpec[] = [{ id: 't', gpu_count: 1 }];
    const servers = [
      srv('A', { gpu_count: 2, gpu_mem_gb: 160 }),
      srv('B', { gpu_count: 4, gpu_mem_gb: 320 }),
    ];
    const r = allocateTasks(tasks, servers);
    expect(r.candidates_per_task['t'][0].server_id).toBe('B');
    expect(r.candidates_per_task['t'][1].server_id).toBe('A');
  });

  it('handles tasks with no constraints (gpu_count default 1)', () => {
    const tasks: TaskSpec[] = [{ id: 't' }];
    const servers = [srv('A', { gpu_count: 1 })];
    const r = allocateTasks(tasks, servers);
    expect(r.recommended_allocation[0]).toMatchObject({ task_id: 't', server_id: 'A' });
  });
});
