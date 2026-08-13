import type { DBServer, DBProxy, DBUsageLog, DBReachability } from './schema';
import { v4 as uuid } from 'uuid';

// ===== Server Queries =====

export async function listServers(db: D1Database, tag?: string): Promise<DBServer[]> {
  let query = 'SELECT * FROM servers';
  const params: unknown[] = [];
  if (tag) {
    query += " WHERE tags LIKE ?";
    params.push(`%"${tag}"%`);
  }
  query += ' ORDER BY created_at DESC';
  const result = await db.prepare(query).bind(...params).all<DBServer>();
  return result.results;
}

export async function getServerById(db: D1Database, id: string): Promise<DBServer | null> {
  const result = await db.prepare('SELECT * FROM servers WHERE id = ?').bind(id).first<DBServer>();
  return result ?? null;
}

export async function createServer(
  db: D1Database,
  data: Omit<DBServer, 'id' | 'created_at' | 'updated_at' | 'status_online' | 'status_last_check' | 'status_ping_ms' | 'status_error'>
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO servers (id, name, vendor_url, host, port, username, auth_method, key_path, key_content, password,
      v2ray_available, direct_when_proxy_available, direct_when_no_proxy,
      gpu_model, gpu_memory_gb, cpu_cores, ram_gb, disk_gb,
      default_proxy_id, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.name, data.vendor_url, data.host, data.port, data.username, data.auth_method,
    data.key_path, data.key_content, data.password,
    data.v2ray_available, data.direct_when_proxy_available, data.direct_when_no_proxy,
    data.gpu_model, data.gpu_memory_gb, data.cpu_cores, data.ram_gb, data.disk_gb,
    data.default_proxy_id, data.tags, now, now
  ).run();
  return id;
}

export async function updateServer(
  db: D1Database,
  id: string,
  updates: Partial<Omit<DBServer, 'id' | 'created_at'>>
): Promise<boolean> {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  params.push(id);
  const sql = `UPDATE servers SET ${sets.join(', ')} WHERE id = ?`;
  const result = await db.prepare(sql).bind(...params).run();
  return result.success;
}

export async function deleteServer(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM servers WHERE id = ?').bind(id).run();
  return result.success;
}

export async function queryServersByAbility(
  db: D1Database,
  filters: {
    gpu_model?: string;
    min_ram_gb?: number;
    min_cpu_cores?: number;
    min_disk_gb?: number;
    status_online?: boolean;
  }
): Promise<DBServer[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.gpu_model) {
    conditions.push('gpu_model = ?');
    params.push(filters.gpu_model);
  }
  if (filters.min_ram_gb !== undefined) {
    conditions.push('ram_gb >= ?');
    params.push(filters.min_ram_gb);
  }
  if (filters.min_cpu_cores !== undefined) {
    conditions.push('cpu_cores >= ?');
    params.push(filters.min_cpu_cores);
  }
  if (filters.min_disk_gb !== undefined) {
    conditions.push('disk_gb >= ?');
    params.push(filters.min_disk_gb);
  }
  if (filters.status_online !== undefined) {
    conditions.push('status_online = ?');
    params.push(filters.status_online ? 1 : 0);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM servers ${where} ORDER BY created_at DESC`;
  const result = await db.prepare(sql).bind(...params).all<DBServer>();
  return result.results;
}

// ===== Proxy Queries =====

export async function listProxies(db: D1Database): Promise<DBProxy[]> {
  const result = await db.prepare('SELECT * FROM proxies ORDER BY created_at DESC').all<DBProxy>();
  return result.results;
}

export async function getProxyById(db: D1Database, id: string): Promise<DBProxy | null> {
  const result = await db.prepare('SELECT * FROM proxies WHERE id = ?').bind(id).first<DBProxy>();
  return result ?? null;
}

export async function createProxy(
  db: D1Database,
  data: Omit<DBProxy, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO proxies (id, name, host, port, username, password, location, protocol, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.host, data.port, data.username, data.password, data.location, data.protocol, now, now).run();
  return id;
}

export async function updateProxy(
  db: D1Database,
  id: string,
  updates: Partial<Omit<DBProxy, 'id' | 'created_at'>>
): Promise<boolean> {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  params.push(id);
  const result = await db.prepare(`UPDATE proxies SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return result.success;
}

export async function deleteProxy(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM proxies WHERE id = ?').bind(id).run();
  return result.success;
}

// ===== Reachability Queries =====

export async function getReachability(
  db: D1Database,
  serverId: string
): Promise<(DBReachability & { proxy_name: string })[]> {
  const result = await db.prepare(`
    SELECT r.*, p.name as proxy_name
    FROM proxy_server_reachability r
    JOIN proxies p ON r.proxy_id = p.id
    WHERE r.server_id = ?
    ORDER BY r.latency_ms ASC
  `).bind(serverId).all();
  return result.results as unknown as (DBReachability & { proxy_name: string })[];
}

export async function upsertReachability(
  db: D1Database,
  proxyId: string,
  serverId: string,
  reachable: boolean,
  latencyMs: number | null
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO proxy_server_reachability (proxy_id, server_id, reachable, latency_ms, last_tested_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(proxy_id, server_id) DO UPDATE SET
      reachable = excluded.reachable,
      latency_ms = excluded.latency_ms,
      last_tested_at = excluded.last_tested_at
  `).bind(proxyId, serverId, reachable ? 1 : 0, latencyMs, now).run();
}

// ===== Usage Log Queries =====

export async function recordUsage(
  db: D1Database,
  data: {
    server_id: string;
    agent_id: string;
    session_id: string;
    action: string;
    details?: string;
  }
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO usage_logs (id, server_id, agent_id, session_id, action, called_at, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.server_id, data.agent_id, data.session_id, data.action, now, data.details ?? null).run();
  return id;
}

export async function getUsageLogs(
  db: D1Database,
  serverId?: string,
  agentId?: string,
  limit = 50
): Promise<DBUsageLog[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (serverId) { conditions.push('server_id = ?'); params.push(serverId); }
  if (agentId) { conditions.push('agent_id = ?'); params.push(agentId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.prepare(
    `SELECT * FROM usage_logs ${where} ORDER BY called_at DESC LIMIT ?`
  ).bind(...params, limit).all<DBUsageLog>();
  return result.results;
}

// ===== Status Update =====

export async function updateServerStatus(
  db: D1Database,
  serverId: string,
  status: { online: boolean; ping_ms: number | null; error?: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE servers SET status_online = ?, status_last_check = ?, status_ping_ms = ?, status_error = ?, updated_at = ?
    WHERE id = ?
  `).bind(status.online ? 1 : 0, now, status.ping_ms, status.error ?? null, now, serverId).run();
}
