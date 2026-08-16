import { describe, it, expect } from 'vitest';
import { getServerPitfalls, getServerNotes, searchTroubleshootingKnowledgeRAG } from '../src/db/queries';

describe('Same-Provider Pitfalls & Notes Sharing', () => {
  it('aggregates pitfalls from peer servers sharing the same provider', async () => {
    const serversData = [
      { id: 's1', name: 'AutoDL-A100', host: '1.1.1.1', provider: 'AutoDL' },
      { id: 's2', name: 'AutoDL-4090', host: '2.2.2.2', provider: 'AutoDL' },
      { id: 's3', name: 'Aliyun-V100', host: '3.3.3.3', provider: '阿里云' },
    ];

    const pitfallsData = [
      { id: 'p1', server_id: 's1', title: 'AutoDL PyTorch Segfault', description: 'desc1', workaround: 'fix1', severity: 'critical', tags: '["cuda"]', agent: 'agent1', created_at: '2026-08-16T10:00:00Z', updated_at: '2026-08-16T10:00:00Z' },
      { id: 'p2', server_id: 's2', title: 'AutoDL Disk Mount Quirk', description: 'desc2', workaround: 'fix2', severity: 'warning', tags: '["mount"]', agent: 'agent2', created_at: '2026-08-16T11:00:00Z', updated_at: '2026-08-16T11:00:00Z' },
      { id: 'p3', server_id: 's3', title: 'Aliyun VPC Gateway', description: 'desc3', workaround: 'fix3', severity: 'info', tags: '["network"]', agent: 'agent3', created_at: '2026-08-16T12:00:00Z', updated_at: '2026-08-16T12:00:00Z' },
    ];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => {
            if (sql.includes('SELECT id, name, host, provider FROM servers WHERE id IN')) {
              const ids = args as string[];
              return { results: serversData.filter(s => ids.includes(s.id)) };
            }
            if (sql.includes('SELECT id, name, host, provider FROM servers WHERE provider IN')) {
              const provs = args as string[];
              return { results: serversData.filter(s => provs.includes(s.provider!)) };
            }
            if (sql.includes('SELECT * FROM server_pitfalls WHERE server_id IN')) {
              const ids = args as string[];
              return { results: pitfallsData.filter(p => ids.includes(p.server_id)) };
            }
            return { results: [] };
          },
          run: async () => ({ success: true }),
        }),
        run: async () => ({ success: true }),
      }),
    } as unknown as D1Database;

    const map = await getServerPitfalls(mockDb, ['s1']);
    expect(map['s1']).toBeDefined();
    // s1 should have its own pitfall (p1) PLUS shared pitfall from s2 (p2, because both are AutoDL)
    expect(map['s1'].length).toBe(2);
    
    const p1 = map['s1'].find(x => x.id === 'p1');
    expect(p1?.is_shared).toBe(false);

    const p2 = map['s1'].find(x => x.id === 'p2');
    expect(p2?.is_shared).toBe(true);
    expect(p2?.provider).toBe('AutoDL');
    expect(p2?.source_server_name).toBe('AutoDL-4090');

    // Should NOT contain p3 from Aliyun
    expect(map['s1'].find(x => x.id === 'p3')).toBeUndefined();
  });

  it('aggregates notes from peer servers sharing the same provider', async () => {
    const serversData = [
      { id: 's1', name: 'AutoDL-A100', host: '1.1.1.1', provider: 'AutoDL' },
      { id: 's2', name: 'AutoDL-4090', host: '2.2.2.2', provider: 'AutoDL' },
    ];

    const notesData = [
      { server_id: 's1', topic: 'cuda_env', content: 'cuda 12.1 configured', updated_by: 'antigravity', updated_at: '2026-08-16T10:00:00Z' },
      { server_id: 's2', topic: 'autodl_proxy', content: 'source /etc/profile.d/00-proxy.sh', updated_by: 'claude', updated_at: '2026-08-16T11:00:00Z' },
    ];

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          all: async () => {
            if (sql.includes('SELECT id, name, host, provider FROM servers WHERE id IN')) {
              const ids = args as string[];
              return { results: serversData.filter(s => ids.includes(s.id)) };
            }
            if (sql.includes('SELECT id, name, host, provider FROM servers WHERE provider IN')) {
              const provs = args as string[];
              return { results: serversData.filter(s => provs.includes(s.provider!)) };
            }
            if (sql.includes('SELECT * FROM server_notes WHERE server_id IN')) {
              const ids = args as string[];
              return { results: notesData.filter(n => ids.includes(n.server_id)) };
            }
            return { results: [] };
          },
          run: async () => ({ success: true }),
        }),
        run: async () => ({ success: true }),
      }),
    } as unknown as D1Database;

    const map = await getServerNotes(mockDb, ['s1']);
    expect(map['s1']).toBeDefined();
    expect(map['s1'].length).toBe(2);

    const n1 = map['s1'].find(x => x.topic === 'cuda_env');
    expect(n1?.is_shared).toBe(false);

    const n2 = map['s1'].find(x => x.topic === 'autodl_proxy');
    expect(n2?.is_shared).toBe(true);
    expect(n2?.provider).toBe('AutoDL');
    expect(n2?.source_server_name).toBe('AutoDL-4090');
  });
});
