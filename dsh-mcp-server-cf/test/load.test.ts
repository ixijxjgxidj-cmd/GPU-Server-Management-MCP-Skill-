import { describe, it, expect } from 'vitest';
import { loadAgeSec, resolveCapacity } from '../src/orchestration/load';
import type { DBServer } from '../src/db/schema';

function baseServer(over: Partial<DBServer> = {}): DBServer {
  return {
    id: 's1', name: 'n', vendor_url: null, host: 'h', port: 22, username: 'u',
    auth_method: 'key', key_path: null, key_content: null, password: null,
    v2ray_available: 0, direct_when_proxy_available: 0, direct_when_no_proxy: 0,
    gpu_model: 'A100', gpu_count: 4, gpu_memory_gb: 80, cpu_cores: 64, ram_gb: 512, disk_gb: 2000,
    status_online: 1, status_last_check: null, status_ping_ms: null, status_error: null,
    default_proxy_id: null, tags: null, current_task: null, current_agent: null,
    task_started_at: null, notes: null, enabled: 1, ssh_banner: null, os_hint: null,
    gpu_util_pct: null, gpu_mem_free_gb: null, ram_free_gb: null, disk_free_gb: null,
    running_tasks: null, load_updated_at: null,
    gpu_sharing_mode: 'exclusive',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('loadAgeSec', () => {
  it('returns null when load_updated_at is null', () => {
    expect(loadAgeSec(baseServer(), '2026-08-14T00:00:00Z')).toBeNull();
  });
  it('returns seconds since load_updated_at', () => {
    const s = baseServer({ load_updated_at: '2026-08-14T00:00:00Z' });
    expect(loadAgeSec(s, '2026-08-14T00:05:30Z')).toBe(330);
  });
});

describe('resolveCapacity', () => {
  const now = '2026-08-14T00:00:00Z';
  it('uses dynamic load when present and not stale', () => {
    const s = baseServer({
      gpu_count: 4, gpu_memory_gb: 80, ram_gb: 512, disk_gb: 2000, cpu_cores: 64,
      gpu_util_pct: 20, gpu_mem_free_gb: 250, ram_free_gb: 400, disk_free_gb: 1500,
      running_tasks: 2, load_updated_at: now,
    });
    const c = resolveCapacity(s, now);
    expect(c).toMatchObject({
      server_id: 's1', name: 'n',
      gpu_count: 2, gpu_mem_gb: 250, ram_gb: 400, disk_gb: 1500, cpu_cores: 64,
      stale: false,
    });
  });
  it('free card count = gpu_count - running_tasks when load present', () => {
    const s = baseServer({ gpu_count: 8, running_tasks: 3, load_updated_at: now });
    expect(resolveCapacity(s, now).gpu_count).toBe(5);
  });
  it('shared mode keeps all physical cards schedulable regardless of running_tasks', () => {
    const s = baseServer({ gpu_sharing_mode: 'shared', gpu_count: 1, running_tasks: 3, gpu_mem_free_gb: 8, load_updated_at: now });
    const c = resolveCapacity(s, now);
    expect(c.gpu_count).toBe(1);          // not clamped to 0 by running_tasks
    expect(c.gpu_mem_gb).toBe(8);         // VRAM headroom is the real limit
    expect(c.gpu_sharing_mode).toBe('shared');
  });
  it('falls back to static spec and marks stale when load absent', () => {
    const s = baseServer({ gpu_count: 4, gpu_memory_gb: 80, ram_gb: 512, disk_gb: 2000, cpu_cores: 64, load_updated_at: null });
    const c = resolveCapacity(s, now);
    expect(c).toMatchObject({
      gpu_count: 4, gpu_mem_gb: 320, ram_gb: 512, disk_gb: 2000, cpu_cores: 64,
      stale: true,
    });
  });
  it('static fallback total VRAM = per-card memory * gpu_count', () => {
    const s = baseServer({ gpu_count: 2, gpu_memory_gb: 40, load_updated_at: null });
    expect(resolveCapacity(s, now).gpu_mem_gb).toBe(80);
  });
});
