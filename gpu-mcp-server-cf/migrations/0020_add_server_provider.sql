-- Add provider (operator/vendor) to servers table for shared pitfalls and notes
ALTER TABLE servers ADD COLUMN provider TEXT; -- e.g. "AutoDL", "RunPod", "Vast.ai", "阿里云", "腾讯云", "恒源云", "极智云", "自建机房"
CREATE INDEX IF NOT EXISTS idx_servers_provider ON servers(provider);
