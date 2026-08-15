-- Static capacity + dynamic load snapshot columns on servers
ALTER TABLE servers ADD COLUMN gpu_count        INTEGER;
ALTER TABLE servers ADD COLUMN gpu_util_pct     INTEGER;
ALTER TABLE servers ADD COLUMN gpu_mem_free_gb  INTEGER;
ALTER TABLE servers ADD COLUMN ram_free_gb      INTEGER;
ALTER TABLE servers ADD COLUMN disk_free_gb     INTEGER;
ALTER TABLE servers ADD COLUMN running_tasks    INTEGER;
ALTER TABLE servers ADD COLUMN load_updated_at  TEXT;

-- Structured, per-topic operational knowledge (append-by-topic upsert)
CREATE TABLE server_notes (
  server_id  TEXT NOT NULL,
  topic      TEXT NOT NULL,
  content    TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (server_id, topic),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);
CREATE INDEX idx_server_notes_server ON server_notes(server_id);
