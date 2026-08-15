-- Migration 0013: Add backup_indexes table with Host-IP lifecycle binding and RAG vector/text search
CREATE TABLE IF NOT EXISTS backup_indexes (
  id TEXT PRIMARY KEY,
  server_host TEXT NOT NULL,
  server_id TEXT,
  folder_name TEXT NOT NULL,
  session_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  backup_type TEXT NOT NULL, -- 'google_drive' | 'peer_server' | 'local_weights'
  purpose TEXT,
  usage_status TEXT,
  remote_path TEXT NOT NULL,
  peer_server_host TEXT,
  peer_connect_cmd TEXT,
  metadata_json TEXT NOT NULL,
  search_text TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_indexes_host ON backup_indexes(server_host);
CREATE INDEX IF NOT EXISTS idx_backup_indexes_session ON backup_indexes(session_name);
CREATE INDEX IF NOT EXISTS idx_backup_indexes_type ON backup_indexes(backup_type);
