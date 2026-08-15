-- Add server physical expiration lease timestamp
ALTER TABLE servers ADD COLUMN server_expires_at TEXT;
