-- Add enabled flag to servers (1=enabled, 0=disabled)
ALTER TABLE servers ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
