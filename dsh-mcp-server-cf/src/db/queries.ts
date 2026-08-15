import type { DBServer, DBProxy, DBUsageLog, DBReachability, DBServerNote, DBBackupIndex } from './schema';
import { v4 as uuid } from 'uuid';

// ===== Server Queries =====

export async function listServers(db: D1Database, tag?: string, onlyEnabled?: boolean): Promise<DBServer[]> {
  let query = 'SELECT * FROM servers';
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (tag) {
    conditions.push("tags LIKE ?");
    params.push(`%"${tag}"%`);
  }
  if (onlyEnabled) {
    conditions.push('enabled = 1');
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';
  const result = await db.prepare(query).bind(...params).all<DBServer>();
  return result.results;
}

export async function getServerById(db: D1Database, id: string): Promise<DBServer | null> {
  const result = await db.prepare('SELECT * FROM servers WHERE id = ?').bind(id).first<DBServer>();
  return result ?? null;
}

// Dedup key for upsert is the host (IP/domain).
export async function getServerByHost(db: D1Database, host: string): Promise<DBServer | null> {
  const result = await db.prepare('SELECT * FROM servers WHERE host = ? LIMIT 1').bind(host).first<DBServer>();
  return result ?? null;
}

// Dedup key for upsert is the host (IP/domain).
// If a server with this host exists, update it. If not, insert it.
export async function upsertServer(
  db: D1Database,
  data: Omit<DBServer, 'id' | 'created_at' | 'updated_at' | 'status_online' | 'status_last_check' | 'status_ping_ms' | 'status_error' | 'current_task' | 'current_agent' | 'task_started_at' | 'task_duration_minutes' | 'task_expires_at' | 'server_expires_at' | 'enabled' | 'ssh_banner' | 'os_hint' | 'gpu_util_pct' | 'gpu_mem_free_gb' | 'ram_free_gb' | 'disk_free_gb' | 'running_tasks' | 'load_updated_at' | 'gpu_sharing_mode' | 'python_version' | 'torch_version' | 'cuda_version' | 'top_cpu_tasks' | 'datasets' | 'connection_type'> & { connection_type?: 'standard' | 'cloudflare_tunnel'; server_expires_at?: string | null }
): Promise<{ id: string; created: boolean }> {
  const existing = await getServerByHost(db, data.host);
  if (existing) {
    await updateServer(db, existing.id, {
      ...data,
      connection_type: data.connection_type ?? existing.connection_type ?? 'standard',
    });
    return { id: existing.id, created: false };
  }
  const id = await createServer(db, data);
  return { id, created: true };
}

export async function createServer(
  db: D1Database,
  data: Omit<DBServer, 'id' | 'created_at' | 'updated_at' | 'status_online' | 'status_last_check' | 'status_ping_ms' | 'status_error' | 'current_task' | 'current_agent' | 'task_started_at' | 'task_duration_minutes' | 'task_expires_at' | 'server_expires_at' | 'enabled' | 'ssh_banner' | 'os_hint' | 'gpu_util_pct' | 'gpu_mem_free_gb' | 'ram_free_gb' | 'disk_free_gb' | 'running_tasks' | 'load_updated_at' | 'gpu_sharing_mode' | 'python_version' | 'torch_version' | 'cuda_version' | 'top_cpu_tasks' | 'datasets' | 'connection_type'> & { connection_type?: 'standard' | 'cloudflare_tunnel'; server_expires_at?: string | null }
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO servers (id, name, vendor_url, host, port, username, auth_method, key_path, key_content, password,
      v2ray_available, direct_when_proxy_available, direct_when_no_proxy,
      gpu_model, gpu_memory_gb, gpu_count, cpu_cores, ram_gb, disk_gb,
      default_proxy_id, tags, notes, connection_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.name, data.vendor_url, data.host, data.port, data.username, data.auth_method,
    data.key_path, data.key_content, data.password,
    data.v2ray_available, data.direct_when_proxy_available, data.direct_when_no_proxy,
    data.gpu_model, data.gpu_memory_gb, data.gpu_count, data.cpu_cores, data.ram_gb, data.disk_gb,
    data.default_proxy_id, data.tags, data.notes, data.connection_type ?? 'standard', now, now
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
  const server = await getServerById(db, id);
  if (server) {
    // 以 IP 地址为唯一计量存不存在：如果索引对应的 IP 的服务器被删除，那索引一同消失
    await deleteBackupIndexesByHost(db, server.host);
  }
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
  // MCP-facing queries only return enabled servers
  conditions.push('enabled = 1');

  const where = 'WHERE ' + conditions.join(' AND ');
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
): Promise<(DBReachability & { proxy_name: string; proxy_host: string; proxy_port: number; proxy_protocol: string })[]> {
  const result = await db.prepare(`
    SELECT r.*, p.name as proxy_name, p.host as proxy_host, p.port as proxy_port, p.protocol as proxy_protocol
    FROM proxy_server_reachability r
    JOIN proxies p ON r.proxy_id = p.id
    WHERE r.server_id = ?
    ORDER BY r.latency_ms ASC
  `).bind(serverId).all();
  return result.results as unknown as (DBReachability & { proxy_name: string; proxy_host: string; proxy_port: number; proxy_protocol: string })[];
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

// ===== Task / Occupation Queries =====

export async function updateServerTask(
  db: D1Database,
  serverId: string,
  task: { agent: string; task: string; duration_minutes?: number }
): Promise<{ started_at: string; expires_at: string | null }> {
  const now = new Date();
  const startedAt = now.toISOString();
  let expiresAt: string | null = null;
  if (task.duration_minutes && task.duration_minutes > 0) {
    expiresAt = new Date(now.getTime() + task.duration_minutes * 60000).toISOString();
  }
  await db.prepare(`
    UPDATE servers SET current_task = ?, current_agent = ?, task_started_at = ?, task_duration_minutes = ?, task_expires_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(task.task, task.agent, startedAt, task.duration_minutes ?? null, expiresAt, startedAt, serverId).run();
  return { started_at: startedAt, expires_at: expiresAt };
}

export async function releaseServerTask(
  db: D1Database,
  serverId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE servers SET current_task = NULL, current_agent = NULL, task_started_at = NULL, task_duration_minutes = NULL, task_expires_at = NULL, updated_at = ?
    WHERE id = ?
  `).bind(now, serverId).run();
}

export async function getServersWithActiveTasks(
  db: D1Database
): Promise<DBServer[]> {
  const result = await db.prepare(
    `SELECT * FROM servers WHERE current_agent IS NOT NULL ORDER BY task_started_at DESC`
  ).all<DBServer>();
  return result.results;
}

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

export async function setServerEnabled(db: D1Database, serverId: string, enabled: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare('UPDATE servers SET enabled = ?, updated_at = ? WHERE id = ?')
    .bind(enabled ? 1 : 0, now, serverId).run();
}

export async function getServerNotes(
  db: D1Database,
  serverIds: string[]
): Promise<Record<string, DBServerNote[]>> {
  if (serverIds.length === 0) return {};
  const placeholders = serverIds.map(() => '?').join(',');
  const result = await db.prepare(
    `SELECT * FROM server_notes WHERE server_id IN (${placeholders}) ORDER BY updated_at DESC`
  ).bind(...serverIds).all<DBServerNote>();
  const map: Record<string, DBServerNote[]> = {};
  for (const n of result.results) {
    (map[n.server_id] ??= []).push(n);
  }
  return map;
}

export async function upsertServerNote(
  db: D1Database,
  serverId: string,
  entry: { topic: string; content: string; updated_by?: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO server_notes (server_id, topic, content, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(server_id, topic) DO UPDATE SET
      content = excluded.content,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).bind(serverId, entry.topic, entry.content, entry.updated_by ?? null, now).run();
}

// ===== Backup Indexes & RAG Queries =====

export async function upsertBackupIndex(
  db: D1Database,
  data: {
    server_host: string;
    server_id?: string | null;
    folder_name: string;
    session_name: string;
    summary: string;
    backup_type: 'google_drive' | 'peer_server' | 'local_weights';
    purpose?: string | null;
    usage_status?: string | null;
    remote_path: string;
    peer_server_host?: string | null;
    peer_connect_cmd?: string | null;
    metadata_json: string;
    search_text?: string;
  }
): Promise<string> {
  const now = new Date().toISOString();
  const existing = await db.prepare(
    'SELECT id FROM backup_indexes WHERE server_host = ? AND folder_name = ?'
  ).bind(data.server_host, data.folder_name).first<{ id: string }>();

  const id = existing?.id || uuid();
  const combinedSearchText = data.search_text || [
    data.server_host,
    data.session_name,
    data.summary,
    data.backup_type,
    data.purpose || '',
    data.usage_status || '',
    data.remote_path,
    data.peer_server_host || '',
    data.folder_name,
  ].join(' ').toLowerCase();

  if (existing) {
    await db.prepare(`
      UPDATE backup_indexes SET
        server_id = ?,
        session_name = ?,
        summary = ?,
        backup_type = ?,
        purpose = ?,
        usage_status = ?,
        remote_path = ?,
        peer_server_host = ?,
        peer_connect_cmd = ?,
        metadata_json = ?,
        search_text = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      data.server_id ?? null,
      data.session_name,
      data.summary,
      data.backup_type,
      data.purpose ?? null,
      data.usage_status ?? null,
      data.remote_path,
      data.peer_server_host ?? null,
      data.peer_connect_cmd ?? null,
      data.metadata_json,
      combinedSearchText,
      now,
      id
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO backup_indexes (
        id, server_host, server_id, folder_name, session_name, summary,
        backup_type, purpose, usage_status, remote_path, peer_server_host,
        peer_connect_cmd, metadata_json, search_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.server_host,
      data.server_id ?? null,
      data.folder_name,
      data.session_name,
      data.summary,
      data.backup_type,
      data.purpose ?? null,
      data.usage_status ?? null,
      data.remote_path,
      data.peer_server_host ?? null,
      data.peer_connect_cmd ?? null,
      data.metadata_json,
      combinedSearchText,
      now,
      now
    ).run();
  }
  return id;
}

export async function listBackupIndexes(
  db: D1Database,
  filter?: { server_host?: string; backup_type?: string }
): Promise<DBBackupIndex[]> {
  let query = 'SELECT * FROM backup_indexes';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.server_host) {
    conditions.push('server_host = ?');
    params.push(filter.server_host);
  }
  if (filter?.backup_type) {
    conditions.push('backup_type = ?');
    params.push(filter.backup_type);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const result = await db.prepare(query).bind(...params).all<DBBackupIndex>();
  return result.results;
}

export async function deleteBackupIndexesByHost(db: D1Database, host: string): Promise<number> {
  const result = await db.prepare('DELETE FROM backup_indexes WHERE server_host = ?').bind(host).run();
  return result.meta.changes ?? 0;
}

export async function deleteBackupIndexById(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM backup_indexes WHERE id = ?').bind(id).run();
  return result.success;
}

export async function searchBackupIndexesRAG(
  db: D1Database,
  queryText: string,
  limit = 5
): Promise<Array<DBBackupIndex & { score: number; relevance_reasons: string[] }>> {
  const all = await listBackupIndexes(db);
  if (all.length === 0) return [];

  const rawTokens = queryText
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);

  if (rawTokens.length === 0) {
    return all.slice(0, limit).map(item => ({
      ...item,
      score: 1.0,
      relevance_reasons: ['全量默认展示'],
    }));
  }

  const scored = all.map(item => {
    let score = 0;
    const reasons: string[] = [];
    const target = item.search_text.toLowerCase();

    for (const token of rawTokens) {
      if (item.summary.toLowerCase().includes(token)) {
        score += 30;
        reasons.push(`匹配摘要: "${token}"`);
      } else if (item.session_name.toLowerCase().includes(token)) {
        score += 25;
        reasons.push(`匹配会话: "${token}"`);
      } else if (item.purpose && item.purpose.toLowerCase().includes(token)) {
        score += 20;
        reasons.push(`匹配用途: "${token}"`);
      } else if (item.usage_status && item.usage_status.toLowerCase().includes(token)) {
        score += 15;
        reasons.push(`匹配状态: "${token}"`);
      } else if (item.server_host.includes(token) || (item.peer_server_host && item.peer_server_host.includes(token))) {
        score += 20;
        reasons.push(`匹配节点 IP: "${token}"`);
      } else if (target.includes(token)) {
        score += 10;
        reasons.push(`匹配索引文本: "${token}"`);
      }
    }

    const ageDays = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 3600 * 24);
    if (ageDays < 7) score += 5;

    return {
      ...item,
      score,
      relevance_reasons: Array.from(new Set(reasons)),
    };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

