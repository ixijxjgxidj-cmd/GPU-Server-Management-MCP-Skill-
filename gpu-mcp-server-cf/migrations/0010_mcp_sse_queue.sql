CREATE TABLE IF NOT EXISTS mcp_sse_sessions (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_sse_queue (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
