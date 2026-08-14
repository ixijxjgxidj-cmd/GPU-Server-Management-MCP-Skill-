import type { DBServer } from '../db/schema';
import type { ServerCapacity } from './types';

export function loadAgeSec(db: DBServer, now: string): number | null {
  if (!db.load_updated_at) return null;
  const ms = Date.parse(now) - Date.parse(db.load_updated_at);
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

// Capacity prefers live load; falls back to static spec and marks stale.
export function resolveCapacity(db: DBServer, now: string): ServerCapacity {
  const stale = db.load_updated_at === null;
  if (!stale) {
    const freeCards = (db.gpu_count ?? 0) - (db.running_tasks ?? 0);
    return {
      server_id: db.id,
      name: db.name,
      gpu_count: Math.max(0, freeCards),
      gpu_mem_gb: db.gpu_mem_free_gb ?? (db.gpu_count ?? 0) * (db.gpu_memory_gb ?? 0),
      ram_gb: db.ram_free_gb ?? db.ram_gb ?? 0,
      disk_gb: db.disk_free_gb ?? db.disk_gb ?? 0,
      cpu_cores: db.cpu_cores ?? 0,
      stale: false,
    };
  }
  return {
    server_id: db.id,
    name: db.name,
    gpu_count: db.gpu_count ?? 0,
    gpu_mem_gb: (db.gpu_count ?? 0) * (db.gpu_memory_gb ?? 0),
    ram_gb: db.ram_gb ?? 0,
    disk_gb: db.disk_gb ?? 0,
    cpu_cores: db.cpu_cores ?? 0,
    stale: true,
  };
}
