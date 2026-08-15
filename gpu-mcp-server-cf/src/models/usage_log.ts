import type { DBUsageLog } from '../db/schema';

export interface UsageLogEntry {
  id: string;
  server_id: string;
  agent_id: string;
  session_id: string;
  action: string;
  called_at: string;
  details?: Record<string, unknown>;
}

export function dbUsageLogToEntry(db: DBUsageLog): UsageLogEntry {
  return {
    id: db.id,
    server_id: db.server_id,
    agent_id: db.agent_id,
    session_id: db.session_id,
    action: db.action,
    called_at: db.called_at,
    details: db.details ? JSON.parse(db.details) : undefined,
  };
}
