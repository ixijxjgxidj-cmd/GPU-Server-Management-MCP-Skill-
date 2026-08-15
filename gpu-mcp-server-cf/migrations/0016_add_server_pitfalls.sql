-- Migration 0016: Add server_pitfalls table
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
);

CREATE INDEX IF NOT EXISTS idx_server_pitfalls_server ON server_pitfalls(server_id);
