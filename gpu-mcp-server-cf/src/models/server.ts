import type { DBServer } from '../db/schema';

export interface ProxyConfig {
  v2ray_available: boolean;
  direct_when_proxy_available: boolean;
  direct_when_no_proxy: boolean;
}

export interface ServerCapabilities {
  gpu_model?: string;
  gpu_memory_gb?: number;
  gpu_count?: number;
  cpu_cores?: number;
  ram_gb?: number;
  disk_gb?: number;
}

export interface ServerSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  gpu_model: string | null;
  status_online: boolean;
  connection_mode_label: string;
  default_proxy_name: string | null;
  last_used_at: string | null;
  last_used_by: string | null;
}

export interface ServerTaskInfo {
  current_task: string | null;
  current_agent: string | null;
  task_started_at: string | null;
  is_busy: boolean;
}

export interface ServerDetail {
  id: string;
  name: string;
  provider?: string | null;
  vendor_url: string | null;
  host: string;
  port: number;
  username: string;
  auth_method: 'key' | 'password';
  key_content: string | null;
  password: string | null;
  proxy: ProxyConfig;
  capabilities: ServerCapabilities;
  connection_mode_label: string;
  status_online: boolean;
  status_last_check: string | null;
  status_ping_ms: number | null;
  status_error: string | null;
  gpu_count: number | null;
  gpu_sharing_mode: 'shared' | 'exclusive';
  connection_type: 'standard' | 'cloudflare_tunnel';
  default_proxy_id: string | null;
  reachable_proxies: Array<{ id: string; name: string; latency_ms: number | null }>;
  tags: string[];
  task: ServerTaskInfo;
  is_jump_host?: boolean;
  notes: string | null;
  mount_points?: string | null;
  primary_data_dir?: string | null;
  environments?: string | null;
  primary_env_cmd?: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function renderConnectionMode(p: ProxyConfig): string {
  if (p.v2ray_available && p.direct_when_proxy_available)
    return '🔓 直连（有V2RayN时可直连）';
  if (p.v2ray_available && !p.direct_when_proxy_available)
    return '🔒 SOCKS5 代理（有V2RayN时走代理）';
  if (!p.v2ray_available && p.direct_when_no_proxy)
    return '🔓 直连（无代理时直连物理网卡）';
  if (!p.v2ray_available && !p.direct_when_no_proxy)
    return '🔒 SOCKS5 代理（无代理时走代理）';
  return '⚠️ 配置未完成';
}

export function dbServerToDetail(
  db: DBServer,
  reachableProxies?: ServerDetail['reachable_proxies']
): ServerDetail {
  const proxy: ProxyConfig = {
    v2ray_available: db.v2ray_available === 1,
    direct_when_proxy_available: db.direct_when_proxy_available === 1,
    direct_when_no_proxy: db.direct_when_no_proxy === 1,
  };
  return {
    id: db.id,
    name: db.name,
    provider: db.provider ?? null,
    vendor_url: db.vendor_url,
    host: db.host,
    port: db.port,
    username: db.username,
    auth_method: db.auth_method,
    key_content: db.key_content,
    password: db.password,
    proxy,
    capabilities: {
      gpu_model: db.gpu_model ?? undefined,
      gpu_memory_gb: db.gpu_memory_gb ?? undefined,
      gpu_count: db.gpu_count ?? undefined,
      cpu_cores: db.cpu_cores ?? undefined,
      ram_gb: db.ram_gb ?? undefined,
      disk_gb: db.disk_gb ?? undefined,
    },
    connection_mode_label: renderConnectionMode(proxy),
    status_online: db.status_online === 1,
    status_last_check: db.status_last_check,
    status_ping_ms: db.status_ping_ms,
    status_error: db.status_error,
    gpu_count: db.gpu_count,
    gpu_sharing_mode: db.gpu_sharing_mode === 'exclusive' ? 'exclusive' : 'shared',
    connection_type: db.connection_type === 'cloudflare_tunnel' ? 'cloudflare_tunnel' : 'standard',
    default_proxy_id: db.default_proxy_id,
    reachable_proxies: reachableProxies ?? [],
    tags: db.tags ? JSON.parse(db.tags) : [],
    task: {
      current_task: db.current_task,
      current_agent: db.current_agent,
      task_started_at: db.task_started_at,
      is_busy: db.current_agent !== null,
    },
    is_jump_host: db.is_jump_host === 1,
    notes: db.notes,
    mount_points: db.mount_points ?? null,
    primary_data_dir: db.primary_data_dir ?? null,
    environments: db.environments ?? null,
    primary_env_cmd: db.primary_env_cmd ?? null,
    enabled: db.enabled === 1,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

export interface LocalProxyInfo {
  deployed: boolean;
  type: 'sing-box' | 'v2ray' | 'clash' | 'other' | null;
  http_port?: number;
  socks_port?: number;
  proxy_url?: string;
  usage: string | null;
}

export interface GoogleDriveServerStatus {
  enabled: boolean;
  status_label: string;
  reason: string;
  setup_command: string;
  push_command: string | null;
  pull_command: string | null;
}

/**
 * Determine whether a server is located in Mainland China based on host, provider, and tags.
 */
export function detectIsChinaMainland(host: string, provider?: string | null, tags?: string[] | null): boolean {
  const h = (host || '').toLowerCase();
  const p = (provider || '').toLowerCase();
  const t = (tags || []).map(x => String(x).toLowerCase());

  // Known overseas hosts/IPs
  if (
    h.startsWith('159.203.') || // DigitalOcean Toronto
    h.startsWith('136.110.') || // GCP US
    h.startsWith('20.243.') ||  // Azure US
    h.startsWith('20.194.') ||
    h.startsWith('20.205.') ||
    h.includes('azure') ||
    h.includes('aws') ||
    h.includes('google') ||
    h.includes('digitalocean') ||
    h.includes('us-') ||
    h.includes('eu-') ||
    h.includes('sg-') ||
    h.includes('hk-')
  ) {
    return false;
  }

  // Known China domains, providers, or tags
  if (
    h.endsWith('.cn') ||
    h.includes('deepln.com') ||
    h.includes('zakocloud.com') ||
    h.includes('scnet.cn') ||
    h.includes('virtaicloud.com') ||
    h.includes('autodl.com') ||
    h.includes('gpushare.com') ||
    h.includes('ucloud') ||
    h.includes('aliyun') ||
    h.includes('tencent') ||
    h.includes('volcengine')
  ) {
    return true;
  }

  if (
    p.includes('autodl') ||
    p.includes('超算') ||
    p.includes('趋动') ||
    p.includes('恒源') ||
    p.includes('阿里') ||
    p.includes('腾讯') ||
    p.includes('华为') ||
    p.includes('国内')
  ) {
    return true;
  }

  if (t.includes('cn') || t.includes('china') || t.includes('domestic') || t.includes('deepln')) {
    return true;
  }

  return false;
}

/**
 * Detect whether local outbound proxy (sing-box, v2ray, clash) is deployed on the server.
 */
export function detectLocalProxy(s: {
  v2ray_available?: number | boolean;
  tags?: string[] | string | null;
  notes?: string | null;
  top_cpu_tasks?: Array<{ cmd?: string; cpu?: number; mem?: number }> | string | null;
}): LocalProxyInfo {
  const tagsArr: string[] = Array.isArray(s.tags)
    ? s.tags
    : typeof s.tags === 'string'
    ? (() => { try { return JSON.parse(s.tags); } catch { return []; } })()
    : [];

  const rawNotes = s.notes || '';
  const notesText = rawNotes.toLowerCase();
  const tagsLower = tagsArr.map(t => String(t).toLowerCase());

  let hasSingBox = tagsLower.includes('sing-box') || notesText.includes('sing-box');
  let hasV2Ray = tagsLower.includes('v2ray') || notesText.includes('v2ray') || s.v2ray_available === 1 || s.v2ray_available === true;
  let hasClash = tagsLower.includes('clash') || notesText.includes('clash');
  let hasProxy = tagsLower.includes('proxy') || tagsLower.includes('global-proxy') || tagsLower.includes('proxy-configured') || notesText.includes('00-proxy.sh');

  if (s.top_cpu_tasks) {
    const tasks = Array.isArray(s.top_cpu_tasks)
      ? s.top_cpu_tasks
      : typeof s.top_cpu_tasks === 'string'
      ? (() => { try { return JSON.parse(s.top_cpu_tasks); } catch { return []; } })()
      : [];
    for (const t of tasks) {
      const cmd = (t.cmd || '').toLowerCase();
      if (cmd.includes('sing-box')) hasSingBox = true;
      if (cmd.includes('v2ray') || cmd.includes('xray')) hasV2Ray = true;
      if (cmd.includes('clash') || cmd.includes('mihomo')) hasClash = true;
    }
  }

  // Standard sing-box outbound ports: HTTP 10809, SOCKS5 10808
  // Note: 10829 is an SSH local-forwarding tunnel port and MUST NEVER be used as the sing-box direct proxy.
  const httpPort = hasClash ? 7890 : 10809;
  const socksPort = hasClash ? 7890 : 10808;
  const proxyUrl = `http://127.0.0.1:${httpPort}`;

  if (hasSingBox) {
    return {
      deployed: true,
      type: 'sing-box',
      http_port: httpPort,
      socks_port: socksPort,
      proxy_url: proxyUrl,
      usage: `source /etc/profile.d/00-proxy.sh (HTTP: 127.0.0.1:${httpPort}, SOCKS5: 127.0.0.1:${socksPort}, proxy-mode on/off)`,
    };
  }

  if (hasV2Ray) {
    return {
      deployed: true,
      type: 'v2ray',
      http_port: httpPort,
      socks_port: socksPort,
      proxy_url: proxyUrl,
      usage: `export http_proxy="${proxyUrl}" https_proxy="${proxyUrl}" ALL_PROXY="socks5://127.0.0.1:${socksPort}"`,
    };
  }

  if (hasClash) {
    return {
      deployed: true,
      type: 'clash',
      http_port: httpPort,
      socks_port: socksPort,
      proxy_url: proxyUrl,
      usage: `export http_proxy="${proxyUrl}" https_proxy="${proxyUrl}" ALL_PROXY="socks5://127.0.0.1:${socksPort}"`,
    };
  }

  if (hasProxy) {
    return {
      deployed: true,
      type: 'other',
      http_port: httpPort,
      socks_port: socksPort,
      proxy_url: proxyUrl,
      usage: `source /etc/profile.d/00-proxy.sh (或 export http_proxy="${proxyUrl}")`,
    };
  }

  return {
    deployed: false,
    type: null,
    usage: null,
  };
}

/**
 * Resolve Google Drive status and commands according to server region and local proxy deployment.
 */
export function resolveServerGoogleDriveStatus(
  isChina: boolean,
  localProxy: LocalProxyInfo,
  workerBaseUrl: string = 'https://gpu-mcp-server-cf.hulkcheng0806.workers.dev'
): GoogleDriveServerStatus {
  if (!isChina) {
    return {
      enabled: true,
      status_label: '🟢 海外节点直连可用（无需出海代理）',
      reason: '海外服务器网络无限制，可直接高速读写 Google Drive',
      setup_command: `curl -fsSL ${workerBaseUrl}/api/gdrive/setup.sh | bash`,
      push_command: 'gdrive-push <local_path> [remote_subdir]',
      pull_command: 'gdrive-pull <remote_path> [local_dir]',
    };
  }

  if (localProxy.deployed) {
    const proxyUrl = localProxy.proxy_url || (localProxy.type === 'clash' ? 'http://127.0.0.1:7890' : 'http://127.0.0.1:10809');
    return {
      enabled: true,
      status_label: `🟢 国内节点已部署 ${localProxy.type || '本地'} 出海代理 (${proxyUrl})，Google Drive 自动走代理加速`,
      reason: '国内节点已部署出海代理，Google Drive (rclone) 自动通过本地代理转发',
      setup_command: `curl -fsSL "${workerBaseUrl}/api/gdrive/setup.sh?proxy=${proxyUrl}" | bash`,
      push_command: `export http_proxy="${proxyUrl}" https_proxy="${proxyUrl}" && gdrive-push <local_path> [remote_subdir]`,
      pull_command: `export http_proxy="${proxyUrl}" https_proxy="${proxyUrl}" && gdrive-pull <remote_path> [local_dir]`,
    };
  }

  return {
    enabled: false,
    status_label: '❌ 位于中国大陆且未部署本地出海代理，Google Drive 已禁用',
    reason: '国内网络无法直连 Google API。需先部署 sing-box / 出海代理后方可启用 Google Drive',
    setup_command: 'echo "❌ 错误: 该服务器位于中国大陆且未部署本地出海代理 (如 sing-box)，Google Drive 已禁用。请先部署出海代理方可使用 Google Drive。"',
    push_command: 'echo "❌ Google Drive 禁用: 国内节点未部署本地出海代理"',
    pull_command: 'echo "❌ Google Drive 禁用: 国内节点未部署本地出海代理"',
  };
}

