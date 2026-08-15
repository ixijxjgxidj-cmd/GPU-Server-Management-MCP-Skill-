import type { DBServer } from '../db/schema';
import { resolveCapacity } from './load';

export interface DiskProvider {
  server: DBServer;
  disk_free_gb: number;
}

export interface SshfsCommands {
  prep_key_cmd: string;
  mount_cmd: string;
  umount_cmd: string;
}

export interface NfsCommands {
  provider_export_cmd: string;
  needy_mount_cmd: string;
}

// Network-reachable: same direct group, or share a reachable proxy.
export function isNetworkReachable(
  a: DBServer,
  b: DBServer,
  reachableProxyIdsByServerId: Record<string, Set<string>>
): boolean {
  const aDirect = a.direct_when_no_proxy === 1 || (a.v2ray_available === 1 && a.direct_when_proxy_available === 1);
  const bDirect = b.direct_when_no_proxy === 1 || (b.v2ray_available === 1 && b.direct_when_proxy_available === 1);
  if (aDirect && bDirect) return true;
  const ap = reachableProxyIdsByServerId[a.id] ?? new Set<string>();
  const bp = reachableProxyIdsByServerId[b.id] ?? new Set<string>();
  for (const p of ap) if (bp.has(p)) return true;
  return false;
}

export function selectDiskProvider(
  needy: DBServer,
  needGb: number,
  candidates: DBServer[],
  reachableProxyIdsByServerId: Record<string, Set<string>>,
  now: string
): DiskProvider | null {
  const viable = candidates
    .filter(s => s.id !== needy.id)
    .filter(s => isNetworkReachable(needy, s, reachableProxyIdsByServerId))
    .map(s => ({ server: s, cap: resolveCapacity(s, now) }))
    .filter(x => x.cap.disk_gb >= needGb)
    .sort((a, b) => b.cap.disk_gb - a.cap.disk_gb);
  const top = viable[0];
  return top ? { server: top.server, disk_free_gb: top.cap.disk_gb } : null;
}

export function buildSshfsCommands(provider: DBServer, needy: DBServer): SshfsCommands {
  const keyB64 = provider.key_content ? btoa(provider.key_content) : '';
  return {
    prep_key_cmd: `echo '${keyB64}' | base64 -d > /tmp/dsh_${provider.id} && chmod 600 /tmp/dsh_${provider.id}`,
    mount_cmd: `sshfs ${provider.username}@${provider.host}:/data /mnt/remote -p ${provider.port} -o IdentityFile=/tmp/dsh_${provider.id}`,
    umount_cmd: 'fusermount -u /mnt/remote',
  };
}

export function buildNfsCommands(provider: DBServer, needy: DBServer): NfsCommands {
  return {
    provider_export_cmd: `echo '/data ${needy.host}(rw,sync,no_subtree_check)' >> /etc/exports && exportfs -ra`,
    needy_mount_cmd: `mount -t nfs ${provider.host}:/data /mnt/remote`,
  };
}
