CREATE TABLE servers (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  vendor_url   TEXT,
  host         TEXT NOT NULL,
  port         INTEGER NOT NULL DEFAULT 22,
  username     TEXT NOT NULL,
  auth_method  TEXT NOT NULL CHECK(auth_method IN ('key', 'password')),
  key_path     TEXT,
  key_content  TEXT,
  password     TEXT,
  v2ray_available              INTEGER NOT NULL DEFAULT 0,
  direct_when_proxy_available  INTEGER NOT NULL DEFAULT 0,
  direct_when_no_proxy         INTEGER NOT NULL DEFAULT 0,
  gpu_model     TEXT,
  gpu_memory_gb INTEGER,
  cpu_cores     INTEGER,
  ram_gb        INTEGER,
  disk_gb       INTEGER,
  status_online      INTEGER NOT NULL DEFAULT 0,
  status_last_check  TEXT,
  status_ping_ms     INTEGER,
  status_error       TEXT,
  default_proxy_id TEXT,
  tags         TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE proxies (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  host       TEXT NOT NULL,
  port       INTEGER NOT NULL DEFAULT 1080,
  username   TEXT,
  password   TEXT,
  location   TEXT,
  protocol   TEXT NOT NULL DEFAULT 'socks5' CHECK(protocol IN ('socks5', 'http')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE usage_logs (
  id         TEXT PRIMARY KEY,
  server_id  TEXT NOT NULL,
  agent_id   TEXT NOT NULL,
  session_id TEXT NOT NULL,
  action     TEXT NOT NULL,
  called_at  TEXT NOT NULL,
  details    TEXT,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE TABLE proxy_server_reachability (
  proxy_id       TEXT NOT NULL,
  server_id      TEXT NOT NULL,
  reachable      INTEGER NOT NULL DEFAULT 0,
  latency_ms     INTEGER,
  last_tested_at TEXT NOT NULL,
  PRIMARY KEY (proxy_id, server_id),
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_server   ON usage_logs(server_id);
CREATE INDEX idx_usage_agent    ON usage_logs(agent_id);
CREATE INDEX idx_usage_time     ON usage_logs(called_at);
CREATE INDEX idx_servers_gpu    ON servers(gpu_model);
CREATE INDEX idx_servers_ram    ON servers(ram_gb);
CREATE INDEX idx_servers_online ON servers(status_online);
CREATE INDEX idx_reach_proxy    ON proxy_server_reachability(proxy_id);
CREATE INDEX idx_reach_server   ON proxy_server_reachability(server_id);
