import { describe, it, expect } from 'vitest';
import { selectDiskProvider, buildSshfsCommands, buildNfsCommands, isNetworkReachable } from '../src/orchestration/disk';
import type { DBServer } from '../src/db/schema';

function srv(id: string, over: Partial<DBServer> = {}): DBServer {
  return {
    id, name: id, vendor_url: null, host: id + '.host', port: 22, username: 'u',
    auth_method: 'key', key_path: null, key_content: 'PEM', password: null,
    v2ray_available: 0, direct_when_proxy_available: 0, direct_when_no_proxy: 1,
    gpu_model: null, gpu_count: null, gpu_memory_gb: null, cpu_cores: null, ram_gb: null, disk_gb: 1000,
    status_online: 1, status_last_check: null, status_ping_ms: null, status_error: null,
    default_proxy_id: null, tags: null, current_task: null, current_agent: null, task_started_at: null,
    notes: null, enabled: 1, ssh_banner: null, os_hint: null,
    gpu_util_pct: null, gpu_mem_free_gb: null, ram_free_gb: null, disk_free_gb: 800, running_tasks: null,
    load_updated_at: '2026-08-14T00:00:00Z',
    gpu_sharing_mode: 'shared',
    connection_type: 'standard',
    python_version: null, torch_version: null, cuda_version: null, top_cpu_tasks: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}
const now = '2026-08-14T00:00:00Z';

describe('isNetworkReachable', () => {
  it('true when both direct', () => {
    expect(isNetworkReachable(srv('a'), srv('b'), {})).toBe(true);
  });
  it('true when share a reachable proxy', () => {
    const a = srv('a', { direct_when_no_proxy: 0 });
    const b = srv('b', { direct_when_no_proxy: 0 });
    const map = { a: new Set(['p1']), b: new Set(['p1']) };
    expect(isNetworkReachable(a, b, map)).toBe(true);
  });
  it('false otherwise', () => {
    const a = srv('a', { direct_when_no_proxy: 0 });
    const b = srv('b', { direct_when_no_proxy: 0 });
    expect(isNetworkReachable(a, b, { a: new Set(['p1']), b: new Set(['p2']) })).toBe(false);
  });
});

describe('selectDiskProvider', () => {
  it('picks the candidate with most free disk that is reachable and meets need', () => {
    const needy = srv('needy', { direct_when_no_proxy: 1, disk_free_gb: 10, disk_gb: 10 });
    const a = srv('a', { disk_free_gb: 300, load_updated_at: now });
    const b = srv('b', { disk_free_gb: 900, load_updated_at: now });
    const r = selectDiskProvider(needy, 200, [a, b], {}, now);
    expect(r?.server.id).toBe('b');
    expect(r?.disk_free_gb).toBe(900);
  });
  it('returns null when none reachable or none have enough disk', () => {
    const needy = srv('needy', { direct_when_no_proxy: 1 });
    const far = srv('far', { direct_when_no_proxy: 0, disk_free_gb: 900, load_updated_at: now });
    expect(selectDiskProvider(needy, 200, [far], { far: new Set(['p9']) }, now)).toBeNull();
  });
});

describe('buildSshfsCommands / buildNfsCommands', () => {
  it('builds sshfs prep + mount + umount with base64 key', () => {
    const p = srv('p1', { username: 'root', host: '1.2.3.4', port: 22, key_content: 'PEM' });
    const n = srv('n1');
    const c = buildSshfsCommands(p, n);
    expect(c.prep_key_cmd).toContain('base64 -d');
    expect(c.mount_cmd).toContain('root@1.2.3.4:/data');
    expect(c.mount_cmd).toContain('IdentityFile=/tmp/dsh_p1');
    expect(c.umount_cmd).toContain('fusermount');
  });
  it('builds nfs export + mount referencing needy host', () => {
    const p = srv('p1', { host: '1.2.3.4' });
    const n = srv('n1', { host: '5.6.7.8' });
    const c = buildNfsCommands(p, n);
    expect(c.provider_export_cmd).toContain('5.6.7.8');
    expect(c.needy_mount_cmd).toContain('1.2.3.4:/data');
  });
});
