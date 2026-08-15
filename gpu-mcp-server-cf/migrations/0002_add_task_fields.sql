-- Add task/occupation tracking fields to servers table
-- These fields track which agent is currently using the server and what task is running.

ALTER TABLE servers ADD COLUMN current_task TEXT;
ALTER TABLE servers ADD COLUMN current_agent TEXT;
ALTER TABLE servers ADD COLUMN task_started_at TEXT;

CREATE INDEX idx_servers_current_agent ON servers(current_agent);
