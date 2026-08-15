CREATE TABLE IF NOT EXISTS proxy_subscriptions (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  url            TEXT NOT NULL,
  auto_refresh   INTEGER NOT NULL DEFAULT 1,
  node_count     INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

ALTER TABLE proxies ADD COLUMN subscription_id TEXT;
ALTER TABLE proxies ADD COLUMN region TEXT;
ALTER TABLE proxies ADD COLUMN target_scores TEXT;
ALTER TABLE proxies ADD COLUMN is_alive INTEGER NOT NULL DEFAULT 1;
