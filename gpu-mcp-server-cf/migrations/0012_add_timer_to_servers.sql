-- Add task countdown timer fields to servers table
ALTER TABLE servers ADD COLUMN task_duration_minutes INTEGER;
ALTER TABLE servers ADD COLUMN task_expires_at TEXT;
