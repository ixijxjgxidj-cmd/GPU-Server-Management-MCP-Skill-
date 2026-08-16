import { describe, it, expect } from 'vitest';
import { getServersTool } from '../src/mcp/tools/get_servers';
import { registerEnvironmentTool } from '../src/mcp/tools/register_environment';
import { removeEnvironmentTool } from '../src/mcp/tools/remove_environment';

describe('Environment & Mount Points Discovery', () => {
  it('registers an environment on a server and marks it primary', async () => {
    let storedEnvs: string | null = null;
    let storedPrimaryCmd: string | null = null;

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.includes('SELECT id, environments')) {
              return {
                id: 's1',
                environments: storedEnvs,
                primary_env_cmd: storedPrimaryCmd,
                python_version: '3.8.10',
                torch_version: null,
                cuda_version: null,
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes('UPDATE servers SET')) {
              storedEnvs = args[0] as string;
              storedPrimaryCmd = args[1] as string;
            }
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database;

    const res = await registerEnvironmentTool.execute({
      server_id: 's1',
      name: 'train_torch24',
      path: '/root/autodl-tmp/conda/envs/train_torch24/bin/python',
      type: 'conda',
      python_version: '3.10.14',
      torch_version: '2.4.0+cu121',
      cuda_version: '12.1',
      packages: ['transformers', 'flash_attn', 'deepspeed'],
      activate_cmd: 'source /root/autodl-tmp/conda/bin/activate train_torch24',
      is_primary: true,
    }, { db: mockDb, env: {} as any });

    expect(res.isError).toBeUndefined();
    expect(storedEnvs).toContain('train_torch24');
    expect(storedEnvs).toContain('2.4.0+cu121');
    expect(storedPrimaryCmd).toBe('source /root/autodl-tmp/conda/bin/activate train_torch24');
  });

  it('removes an environment from a server', async () => {
    let storedEnvs: string | null = JSON.stringify([
      { name: 'env1', path: '/p1' },
      { name: 'env2', path: '/p2' },
    ]);

    const mockDb = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => ({ id: 's1', environments: storedEnvs }),
          run: async () => {
            storedEnvs = args[0] as string;
            return { success: true };
          },
        }),
      }),
    } as unknown as D1Database;

    const res = await removeEnvironmentTool.execute({
      server_id: 's1',
      name: 'env1',
    }, { db: mockDb, env: {} as any });

    expect(res.isError).toBeUndefined();
    expect(storedEnvs).not.toContain('env1');
    expect(storedEnvs).toContain('env2');
  });
});
