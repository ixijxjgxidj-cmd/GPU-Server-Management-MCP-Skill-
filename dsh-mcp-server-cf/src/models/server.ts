import type { DBServer } from '../db/schema';

export interface ProxyConfig {
  v2ray_available: boolean;
  direct_when_proxy_available: boolean;
  direct_when_no_proxy: boolean;
}

export interface ServerCapabilities {
  gpu_model?: string;
  gpu_memory_gb?: number;
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

export interface ServerDetail {
  id: string;
  name: string;
  vendor_url: string | null;
  host: string;
  port: number;
  username: string;
  auth_method: 'key' | 'password';
  proxy: ProxyConfig;
  capabilities: ServerCapabilities;
  connection_mode_label: string;
  status_online: boolean;
  status_last_check: string | null;
  status_ping_ms: number | null;
  status_error: string | null;
  default_proxy_id: string | null;
  reachable_proxies: Array<{ id: string; name: string; latency_ms: number | null }>;
  tags: string[];
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
    vendor_url: db.vendor_url,
    host: db.host,
    port: db.port,
    username: db.username,
    auth_method: db.auth_method,
    proxy,
    capabilities: {
      gpu_model: db.gpu_model ?? undefined,
      gpu_memory_gb: db.gpu_memory_gb ?? undefined,
      cpu_cores: db.cpu_cores ?? undefined,
      ram_gb: db.ram_gb ?? undefined,
      disk_gb: db.disk_gb ?? undefined,
    },
    connection_mode_label: renderConnectionMode(proxy),
    status_online: db.status_online === 1,
    status_last_check: db.status_last_check,
    status_ping_ms: db.status_ping_ms,
    status_error: db.status_error,
    default_proxy_id: db.default_proxy_id,
    reachable_proxies: reachableProxies ?? [],
    tags: db.tags ? JSON.parse(db.tags) : [],
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}
