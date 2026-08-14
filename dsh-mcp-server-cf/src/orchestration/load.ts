import type { DBServer } from '../db/schema';
import type { ServerCapacity } from './types';

export function loadAgeSec(db: DBServer, now: string): number | null {
  if (!db.load_updated_at) return null;
  const ms = Date.parse(now) - Date.parse(db.load_updated_at);
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

// Capacity prefers live load; falls back to static spec and marks stale.
// GPU capacity depends on the server's sharing mode:
//  - exclusive: schedulable cards = gpu_count - running_tasks (a task owns whole cards)
//  - shared (default): all physical cards remain schedulable; VRAM headroom is the real limit,
//    so co-located tasks are gated by gpu_mem_gb rather than by a shrinking card count.
export function resolveCapacity(db: DBServer, now: string): ServerCapacity {
  const mode: 'shared' | 'exclusive' = db.gpu_sharing_mode === 'exclusive' ? 'exclusive' : 'shared';
  const stale = db.load_updated_at === null;
  const physicalCards = db.gpu_count ?? 0;
  const running = db.running_tasks ?? 0;

  const schedulableCards = mode === 'exclusive'
    ? Math.max(0, physicalCards - running)
    : physicalCards;

  if (!stale) {
    return {
      server_id: db.id,
      name: db.name,
      gpu_count: schedulableCards,
      gpu_mem_gb: db.gpu_mem_free_gb ?? physicalCards * (db.gpu_memory_gb ?? 0),
      ram_gb: db.ram_free_gb ?? db.ram_gb ?? 0,
      disk_gb: db.disk_free_gb ?? db.disk_gb ?? 0,
      cpu_cores: db.cpu_cores ?? 0,
      stale: false,
      gpu_sharing_mode: mode,
    };
  }
  // Static fallback: no live running_tasks, so exclusive == physical cards too.
  return {
    server_id: db.id,
    name: db.name,
    gpu_count: physicalCards,
    gpu_mem_gb: physicalCards * (db.gpu_memory_gb ?? 0),
    ram_gb: db.ram_gb ?? 0,
    disk_gb: db.disk_gb ?? 0,
    cpu_cores: db.cpu_cores ?? 0,
    stale: true,
    gpu_sharing_mode: mode,
  };
}
