-- Migration 0021: Add category and is_global to server_pitfalls for permanent Proxy Knowledge Zone
ALTER TABLE server_pitfalls ADD COLUMN category TEXT DEFAULT 'general';
ALTER TABLE server_pitfalls ADD COLUMN is_global INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_server_pitfalls_category ON server_pitfalls(category);
CREATE INDEX IF NOT EXISTS idx_server_pitfalls_global ON server_pitfalls(is_global);
