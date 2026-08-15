import type { McpTool } from './index';
import { queryServersByAbility, getReachability } from '../../db/queries';
import { selectDiskProvider, buildSshfsCommands, buildNfsCommands } from '../../orchestration/disk';

export const planDiskShareTool: McpTool = {
  definition: {
    name: 'plan_disk_share',
    description: '当一台机器硬盘不足时,选出另一台硬盘富余且网络可达的机器作供应机,返回sshfs(默认)或nfs挂载命令(用get_servers的base64密钥拼全)。mode: sshfs|nfs|both。',
    inputSchema: {
      type: 'object',
      properties: {
        needy_server_id: { type: 'string', description: '缺盘机ID(来自get_servers)。' },
        need_gb: { type: 'number', description: '需要的磁盘GB。' },
        mode: { type: 'string', enum: ['sshfs', 'nfs', 'both'], default: 'sshfs' },
      },
      required: ['needy_server_id', 'need_gb'],
    },
  },
  execute: async (args, { db }) => {
    const needyId = args.needy_server_id as string;
    const needGb = args.need_gb as number;
    const mode = (args.mode as string) ?? 'sshfs';
    const now = new Date().toISOString();

    const all = await queryServersByAbility(db, { status_online: true });
    const needy = all.find(s => s.id === needyId);
    if (!needy) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'needy server not found' }) }], isError: true };
    }
    const candidates = all.filter(s => s.id !== needyId);

    // Build reachable-proxy-id map for network reachability.
    const reachMap: Record<string, Set<string>> = {};
    for (const s of all) {
      const r = await getReachability(db, s.id);
      reachMap[s.id] = new Set(r.filter(x => x.reachable === 1).map(x => x.proxy_id));
    }

    const provider = selectDiskProvider(needy, needGb, candidates, reachMap, now);
    if (!provider) {
      return { content: [{ type: 'text', text: JSON.stringify({ needy_server: { id: needy.id, name: needy.name }, error: 'no reachable server with enough free disk', need_gb: needGb }) }], isError: true };
    }
    const out: Record<string, unknown> = {
      provider_server: { id: provider.server.id, name: provider.server.name, disk_free_gb: provider.disk_free_gb },
      needy_server: { id: needy.id, name: needy.name },
    };
    out.sshfs = buildSshfsCommands(provider.server, needy);
    if (mode === 'nfs' || mode === 'both') out.nfs = buildNfsCommands(provider.server, needy);
    out.how_to = '在缺盘机执行 sshfs.prep_key_cmd + sshfs.mount_cmd 即可像本地目录用供应机磁盘;长期共享用 nfs;用完 sshfs.umount_cmd 卸载。';
    return { content: [{ type: 'text', text: JSON.stringify(out) }] };
  },
};
