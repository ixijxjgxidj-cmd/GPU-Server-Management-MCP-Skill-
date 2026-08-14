import { describe, it, expect } from 'vitest';
import { planRelay, buildProxyAcceleration, buildJumpRelay } from '../src/orchestration/network';
import type { DBServer } from '../src/db/schema';

function srv(id: string, over: Partial<DBServer> = {}): DBServer {
  return {
    id, name: id, vendor_url: null, host: id + '.host', port: 22, username: 'u',
    auth_method: 'key', key_path: null, key_content: null, password: null,
    v2ray_available: 0, direct_when_proxy_available: 0, direct_when_no_proxy: 1,
    gpu_model: null, gpu_count: null, gpu_memory_gb: null, cpu_cores: null, ram_gb: null, disk_gb: null,
    status_online: 1, status_last_check: null, status_ping_ms: null, status_error: null,
    default_proxy_id: null, tags: null, current_task: null, current_agent: null, task_started_at: null,
    notes: null, enabled: 1, ssh_banner: null, os_hint: null,
    gpu_util_pct: null, gpu_mem_free_gb: null, ram_free_gb: null, disk_free_gb: null, running_tasks: null,
    load_updated_at: null, gpu_sharing_mode: 'shared', python_version: null, torch_version: null, cuda_version: null, top_cpu_tasks: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}
const proxy = { id: 'p1', name: 'HK', host: '1.2.3.4', port: 1080, protocol: 'socks5', latency_ms: 40 };

describe('buildProxyAcceleration', () => {
  it('produces env/proxychains/git/wget/pip commands all referencing the proxy', () => {
    const a = buildProxyAcceleration(proxy, 'https://x/y');
    expect(a.commands.env).toContain('socks5://1.2.3.4:1080');
    expect(a.commands.git).toContain('socks5://1.2.3.4:1080');
    expect(a.commands.wget).toContain('https://x/y');
    expect(a.commands.pip).toContain('socks5://1.2.3.4:1080');
  });
});

describe('buildJumpRelay', () => {
  it('produces jump download + scp-to-target steps', () => {
    const j = buildJumpRelay(srv('jump', { host: 'j.h' }), srv('t', { host: 't.h', username: 'root' }), 'https://x/y');
    expect(j.steps[0]).toContain('j.h');
    expect(j.steps[1]).toContain('root@t.h');
  });
});

describe('planRelay', () => {
  it('returns proxy_acceleration when a reachable proxy exists', () => {
    const r = planRelay(srv('t'), 'https://x/y', [proxy], []);
    expect(r.proxy_acceleration).toBeDefined();
    expect(r.jump_relay).toBeUndefined();
  });
  it('returns jump_relay when no proxy but a healthy jump server exists', () => {
    const r = planRelay(srv('t', { direct_when_no_proxy: 0 }), 'https://x/y', [], [srv('jump')]);
    expect(r.jump_relay).toBeDefined();
    expect(r.proxy_acceleration).toBeUndefined();
  });
  it('returns both when both are available', () => {
    const r = planRelay(srv('t'), 'https://x/y', [proxy], [srv('jump')]);
    expect(r.proxy_acceleration).toBeDefined();
    expect(r.jump_relay).toBeDefined();
  });
  it('returns degradation how_to when neither available', () => {
    const r = planRelay(srv('t', { direct_when_no_proxy: 0 }), 'https://x/y', [], []);
    expect(r.proxy_acceleration).toBeUndefined();
    expect(r.jump_relay).toBeUndefined();
    expect(r.how_to).toContain('verify_server_connectivity');
  });
});
