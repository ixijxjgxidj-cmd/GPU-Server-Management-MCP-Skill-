import type { DBServer, DBProxy, DBProxySubscription, DBUsageLog, DBReachability, DBServerNote, DBServerPitfall, DBBackupIndex } from './schema';
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
  data: Omit<DBServer, 'id' | 'created_at' | 'updated_at' | 'status_online' | 'status_last_check' | 'status_ping_ms' | 'status_error' | 'current_task' | 'current_agent' | 'task_started_at' | 'task_duration_minutes' | 'task_expires_at' | 'server_expires_at' | 'enabled' | 'ssh_banner' | 'os_hint' | 'gpu_util_pct' | 'gpu_mem_free_gb' | 'ram_free_gb' | 'disk_free_gb' | 'running_tasks' | 'load_updated_at' | 'gpu_sharing_mode' | 'python_version' | 'torch_version' | 'cuda_version' | 'top_cpu_tasks' | 'datasets' | 'connection_type' | 'is_jump_host'> & { connection_type?: 'standard' | 'cloudflare_tunnel'; server_expires_at?: string | null; is_jump_host?: number }
): Promise<{ id: string; created: boolean }> {
  const existing = await getServerByHost(db, data.host);
  if (existing) {
    await updateServer(db, existing.id, {
      ...data,
      connection_type: data.connection_type ?? existing.connection_type ?? 'standard',
      is_jump_host: data.is_jump_host !== undefined ? data.is_jump_host : existing.is_jump_host ?? 0,
    });
    return { id: existing.id, created: false };
  }
  const id = await createServer(db, data);
  return { id, created: true };
}

export async function createServer(
  db: D1Database,
  data: Omit<DBServer, 'id' | 'created_at' | 'updated_at' | 'status_online' | 'status_last_check' | 'status_ping_ms' | 'status_error' | 'current_task' | 'current_agent' | 'task_started_at' | 'task_duration_minutes' | 'task_expires_at' | 'server_expires_at' | 'enabled' | 'ssh_banner' | 'os_hint' | 'gpu_util_pct' | 'gpu_mem_free_gb' | 'ram_free_gb' | 'disk_free_gb' | 'running_tasks' | 'load_updated_at' | 'gpu_sharing_mode' | 'python_version' | 'torch_version' | 'cuda_version' | 'top_cpu_tasks' | 'datasets' | 'connection_type' | 'is_jump_host'> & { connection_type?: 'standard' | 'cloudflare_tunnel'; server_expires_at?: string | null; is_jump_host?: number }
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO servers (id, name, vendor_url, host, port, username, auth_method, key_path, key_content, password,
      v2ray_available, direct_when_proxy_available, direct_when_no_proxy,
      gpu_model, gpu_memory_gb, gpu_count, cpu_cores, ram_gb, disk_gb,
      default_proxy_id, tags, notes, connection_type, is_jump_host, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.name, data.vendor_url, data.host, data.port, data.username, data.auth_method,
    data.key_path, data.key_content, data.password,
    data.v2ray_available, data.direct_when_proxy_available, data.direct_when_no_proxy,
    data.gpu_model, data.gpu_memory_gb, data.gpu_count, data.cpu_cores, data.ram_gb, data.disk_gb,
    data.default_proxy_id, data.tags, data.notes, data.connection_type ?? 'standard', data.is_jump_host || 0, now, now
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
    INSERT INTO proxies (id, name, host, port, username, password, location, protocol, subscription_id, region, target_scores, is_alive, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    data.name,
    data.host,
    data.port,
    data.username ?? null,
    data.password ?? null,
    data.location ?? null,
    data.protocol,
    data.subscription_id ?? null,
    data.region ?? null,
    data.target_scores ?? null,
    data.is_alive ?? 1,
    now,
    now
  ).run();
  return id;
}

export async function batchUpsertProxies(
  db: D1Database,
  proxies: Array<Omit<DBProxy, 'id' | 'created_at' | 'updated_at'> & { id?: string }>
): Promise<number> {
  let count = 0;
  const now = new Date().toISOString();
  for (const p of proxies) {
    const id = p.id || uuid();
    // Check if duplicate host+port exists
    const existing = await db.prepare('SELECT id FROM proxies WHERE host = ? AND port = ?').bind(p.host, p.port).first<{ id: string }>();
    if (existing) {
      await db.prepare(`
        UPDATE proxies SET
          name = ?, protocol = ?, username = ?, password = ?, location = ?,
          subscription_id = COALESCE(?, subscription_id),
          region = COALESCE(?, region),
          is_alive = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        p.name, p.protocol, p.username ?? null, p.password ?? null, p.location ?? null,
        p.subscription_id ?? null, p.region ?? null, p.is_alive ?? 1, now, existing.id
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO proxies (id, name, host, port, username, password, location, protocol, subscription_id, region, target_scores, is_alive, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, p.name, p.host, p.port, p.username ?? null, p.password ?? null, p.location ?? null,
        p.protocol, p.subscription_id ?? null, p.region ?? null, p.target_scores ?? null, p.is_alive ?? 1, now, now
      ).run();
    }
    count++;
  }
  return count;
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

// ===== Proxy Subscription Queries =====

export async function createProxySubscription(
  db: D1Database,
  data: { name: string; url: string; auto_refresh?: number }
): Promise<string> {
  const id = uuid();
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO proxy_subscriptions (id, name, url, auto_refresh, node_count, last_synced_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.url, data.auto_refresh ?? 1, 0, null, now, now).run();
  return id;
}

export async function listProxySubscriptions(db: D1Database): Promise<DBProxySubscription[]> {
  const result = await db.prepare('SELECT * FROM proxy_subscriptions ORDER BY created_at DESC').all<DBProxySubscription>();
  return result.results || [];
}

export async function getProxySubscription(db: D1Database, id: string): Promise<DBProxySubscription | null> {
  return await db.prepare('SELECT * FROM proxy_subscriptions WHERE id = ?').bind(id).first<DBProxySubscription>();
}

export async function updateProxySubscription(
  db: D1Database,
  id: string,
  updates: Partial<Omit<DBProxySubscription, 'id' | 'created_at'>>
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
  const result = await db.prepare(`UPDATE proxy_subscriptions SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return result.success;
}

export async function deleteProxySubscription(db: D1Database, id: string): Promise<boolean> {
  // Delete all proxies associated with this subscription
  await db.prepare('DELETE FROM proxies WHERE subscription_id = ?').bind(id).run();
  const result = await db.prepare('DELETE FROM proxy_subscriptions WHERE id = ?').bind(id).run();
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

// ===== Server Pitfalls (踩坑记录与经验沉淀) =====

export async function ensurePitfallsTable(db: D1Database): Promise<void> {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS server_pitfalls (
        id          TEXT PRIMARY KEY,
        server_id   TEXT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT NOT NULL,
        workaround  TEXT NOT NULL,
        severity    TEXT DEFAULT 'warning',
        tags        TEXT,
        agent       TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
      )
    `).run();
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_server_pitfalls_server ON server_pitfalls(server_id)
    `).run();
  } catch (e) {
    console.warn('ensurePitfallsTable error or already exists:', e);
  }
}

export async function getServerPitfalls(
  db: D1Database,
  serverIds: string[]
): Promise<Record<string, DBServerPitfall[]>> {
  if (serverIds.length === 0) return {};
  await ensurePitfallsTable(db);
  const placeholders = serverIds.map(() => '?').join(',');
  try {
    const result = await db.prepare(
      `SELECT * FROM server_pitfalls WHERE server_id IN (${placeholders}) ORDER BY created_at DESC`
    ).bind(...serverIds).all<DBServerPitfall>();
    const map: Record<string, DBServerPitfall[]> = {};
    for (const p of result.results) {
      (map[p.server_id] ??= []).push(p);
    }
    return map;
  } catch {
    return {};
  }
}

export async function getPitfallsForServer(
  db: D1Database,
  serverId: string
): Promise<DBServerPitfall[]> {
  await ensurePitfallsTable(db);
  try {
    const result = await db.prepare(
      'SELECT * FROM server_pitfalls WHERE server_id = ? ORDER BY created_at DESC'
    ).bind(serverId).all<DBServerPitfall>();
    return result.results;
  } catch {
    return [];
  }
}

export async function addServerPitfall(
  db: D1Database,
  data: {
    server_id: string;
    title: string;
    description: string;
    workaround: string;
    severity?: 'info' | 'warning' | 'critical';
    tags?: string[];
    agent?: string;
  }
): Promise<DBServerPitfall> {
  await ensurePitfallsTable(db);
  const id = uuid();
  const now = new Date().toISOString();
  const severity = data.severity || 'warning';
  const tagsJson = data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : null;
  const agent = data.agent || 'agent';

  await db.prepare(`
    INSERT INTO server_pitfalls (id, server_id, title, description, workaround, severity, tags, agent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.server_id, data.title, data.description, data.workaround,
    severity, tagsJson, agent, now, now
  ).run();

  return {
    id,
    server_id: data.server_id,
    title: data.title,
    description: data.description,
    workaround: data.workaround,
    severity,
    tags: tagsJson,
    agent,
    created_at: now,
    updated_at: now,
  };
}

export async function deleteServerPitfall(
  db: D1Database,
  id: string
): Promise<boolean> {
  await ensurePitfallsTable(db);
  const result = await db.prepare('DELETE FROM server_pitfalls WHERE id = ?').bind(id).run();
  return result.success;
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

// ===== Unified Troubleshooting & Knowledge Base RAG =====

export interface RAGKnowledgeItem {
  id: string;
  source_type: 'pitfall' | 'server_remark' | 'server_topic_note' | 'backup_index';
  server_id: string | null;
  server_name: string;
  server_host: string;
  title: string;
  problem_summary: string;
  workaround_or_content: string;
  severity?: 'info' | 'warning' | 'critical';
  tags: string[];
  agent?: string | null;
  created_at: string;
  score: number;
  relevance_reasons: string[];
}

export async function searchTroubleshootingKnowledgeRAG(
  db: D1Database,
  queryText: string,
  options?: {
    serverId?: string;
    category?: 'all' | 'pitfall' | 'note' | 'backup';
    limit?: number;
  }
): Promise<RAGKnowledgeItem[]> {
  await ensurePitfallsTable(db);
  const limit = options?.limit ?? 10;
  const targetCategory = options?.category ?? 'all';
  const targetServerId = options?.serverId;

  // 1. Fetch servers map for context
  const servers = await listServers(db);
  const serverMap = new Map<string, DBServer>();
  servers.forEach(s => serverMap.set(s.id, s));

  const items: RAGKnowledgeItem[] = [];

  // 2. Fetch pitfalls
  if (targetCategory === 'all' || targetCategory === 'pitfall') {
    try {
      let pitfallQuery = 'SELECT * FROM server_pitfalls';
      const params: unknown[] = [];
      if (targetServerId) {
        pitfallQuery += ' WHERE server_id = ?';
        params.push(targetServerId);
      }
      pitfallQuery += ' ORDER BY created_at DESC';
      const pitfallRows = await db.prepare(pitfallQuery).bind(...params).all<DBServerPitfall>();
      for (const p of pitfallRows.results) {
        const s = serverMap.get(p.server_id);
        let tags: string[] = [];
        if (p.tags) {
          try { tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags; } catch {}
        }
        items.push({
          id: p.id,
          source_type: 'pitfall',
          server_id: p.server_id,
          server_name: s ? s.name : '未知节点',
          server_host: s ? s.host : '',
          title: p.title,
          problem_summary: p.description,
          workaround_or_content: p.workaround,
          severity: p.severity || 'warning',
          tags,
          agent: p.agent,
          created_at: p.created_at,
          score: 0,
          relevance_reasons: [],
        });
      }
    } catch (e) {
      console.warn('searchTroubleshootingKnowledgeRAG fetch pitfalls error:', e);
    }
  }

  // 3. Fetch server remarks and notes
  if (targetCategory === 'all' || targetCategory === 'note') {
    for (const s of servers) {
      if (targetServerId && s.id !== targetServerId) continue;
      // Server remarks (s.notes)
      if (s.notes && s.notes.trim().length > 0) {
        items.push({
          id: `note-remark-${s.id}`,
          source_type: 'server_remark',
          server_id: s.id,
          server_name: s.name,
          server_host: s.host,
          title: `服务器 [${s.name}] 综合运维备注与配置备忘`,
          problem_summary: `节点特有环境与配置提示 (${s.host}:${s.port})`,
          workaround_or_content: s.notes,
          severity: 'info',
          tags: ['server-notes', s.os_hint || 'linux'].filter(Boolean),
          agent: 'system',
          created_at: s.updated_at,
          score: 0,
          relevance_reasons: [],
        });
      }
    }

    // Structured server_notes table
    try {
      let notesQuery = 'SELECT * FROM server_notes';
      const params: unknown[] = [];
      if (targetServerId) {
        notesQuery += ' WHERE server_id = ?';
        params.push(targetServerId);
      }
      const noteRows = await db.prepare(notesQuery).bind(...params).all<DBServerNote>();
      for (const n of noteRows.results) {
        const s = serverMap.get(n.server_id);
        items.push({
          id: `topic-note-${n.server_id}-${n.topic}`,
          source_type: 'server_topic_note',
          server_id: n.server_id,
          server_name: s ? s.name : '未知节点',
          server_host: s ? s.host : '',
          title: `[${s ? s.name : n.server_id}] 专题笔记: ${n.topic}`,
          problem_summary: `针对主题 [${n.topic}] 的专属运维/配置规范`,
          workaround_or_content: n.content,
          severity: 'info',
          tags: ['topic-note', n.topic],
          agent: n.updated_by,
          created_at: n.updated_at,
          score: 0,
          relevance_reasons: [],
        });
      }
    } catch {}
  }

  // 4. Fetch backup indexes
  if (targetCategory === 'all' || targetCategory === 'backup') {
    try {
      const backups = await listBackupIndexes(db, targetServerId ? { server_host: serverMap.get(targetServerId)?.host } : undefined);
      for (const b of backups) {
        items.push({
          id: b.id,
          source_type: 'backup_index',
          server_id: b.server_id,
          server_name: b.server_host,
          server_host: b.server_host,
          title: `备份产出: ${b.session_name} (${b.summary})`,
          problem_summary: `用途: ${b.purpose || '无'} | 状态: ${b.usage_status || '无'}`,
          workaround_or_content: `远端挂载路径: ${b.remote_path}${b.peer_connect_cmd ? `\n连接取用指令: ${b.peer_connect_cmd}` : ''}`,
          severity: 'info',
          tags: ['backup', b.backup_type],
          agent: 'backup-manager',
          created_at: b.created_at,
          score: 0,
          relevance_reasons: [],
        });
      }
    } catch {}
  }

  if (items.length === 0) return [];

  // 5. Intelligent Ranking
  const rawTokens = (queryText || '')
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\.\-\_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);

  if (rawTokens.length === 0) {
    return items.slice(0, limit).map(item => ({
      ...item,
      score: 1.0,
      relevance_reasons: ['最新经验沉淀展示'],
    }));
  }

  const scored = items.map(item => {
    let score = 0;
    const reasons: string[] = [];
    const fullText = (item.title + ' ' + item.problem_summary + ' ' + item.workaround_or_content + ' ' + item.tags.join(' ') + ' ' + item.server_name + ' ' + item.server_host).toLowerCase();

    for (const token of rawTokens) {
      if (item.title.toLowerCase().includes(token)) {
        score += 45;
        reasons.push(`匹配标题核心词: "${token}"`);
      } else if (item.workaround_or_content.toLowerCase().includes(token)) {
        score += 35;
        reasons.push(`匹配避坑方案/指令: "${token}"`);
      } else if (item.problem_summary.toLowerCase().includes(token)) {
        score += 30;
        reasons.push(`匹配问题与报错日志: "${token}"`);
      } else if (item.tags.some(t => t.toLowerCase().includes(token))) {
        score += 25;
        reasons.push(`匹配技术标签: "${token}"`);
      } else if (item.server_name.toLowerCase().includes(token) || item.server_host.toLowerCase().includes(token)) {
        score += 20;
        reasons.push(`匹配机器名或 IP: "${token}"`);
      } else if (fullText.includes(token)) {
        score += 10;
        reasons.push(`匹配全文特征: "${token}"`);
      }
    }

    // Weight by severity
    if (item.severity === 'critical') score += 10;
    else if (item.severity === 'warning') score += 5;

    // Weight by source_type (pitfalls are prioritized for troubleshooting)
    if (item.source_type === 'pitfall') score += 8;

    // Weight by freshness
    if (item.created_at) {
      const ageDays = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 3600 * 24);
      if (ageDays < 7) score += 5;
    }

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

export async function getSystemSetting(db: D1Database, key: string): Promise<string | null> {
  try {
    const res = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first<{ value: string }>();
    return res ? res.value : null;
  } catch (e) {
    return null;
  }
}

export async function setSystemSetting(db: D1Database, key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(key, value, now).run();
}

