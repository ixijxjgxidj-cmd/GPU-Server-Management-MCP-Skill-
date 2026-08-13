export interface DBServer {
  id: string;
  name: string;
  vendor_url: string | null;
  host: string;
  port: number;
  username: string;
  auth_method: 'key' | 'password';
  key_path: string | null;
  key_content: string | null;
  password: string | null;
  v2ray_available: number; // 0 or 1
  direct_when_proxy_available: number;
  direct_when_no_proxy: number;
  gpu_model: string | null;
  gpu_memory_gb: number | null;
  cpu_cores: number | null;
  ram_gb: number | null;
  disk_gb: number | null;
  status_online: number;
  status_last_check: string | null;
  status_ping_ms: number | null;
  status_error: string | null;
  default_proxy_id: string | null;
  tags: string | null; // JSON array
  current_task: string | null;   // What task is currently running (e.g. "train-llm", "inference-api")
  current_agent: string | null;  // Which agent is using this server (e.g. "deepseek-coder", "user-abc")
  task_started_at: string | null; // When the current task started
  notes: string | null;  // User remarks/notes about the server
  enabled: number;  // 1=enabled (visible to MCP), 0=disabled (hidden from MCP)
  ssh_banner: string | null;  // SSH server banner text
  os_hint: string | null;     // Detected OS type (Ubuntu, Debian, etc.)
  created_at: string;
  updated_at: string;
}

export interface DBProxy {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  location: string | null;
  protocol: 'socks5' | 'http';
  created_at: string;
  updated_at: string;
}

export interface DBUsageLog {
  id: string;
  server_id: string;
  agent_id: string;
  session_id: string;
  action: string;
  called_at: string;
  details: string | null; // JSON
}

export interface DBReachability {
  proxy_id: string;
  server_id: string;
  reachable: number;
  latency_ms: number | null;
  last_tested_at: string;
}

// Types that include D1 result types
export interface Env {
  DB: D1Database;
  PING_API_KEY?: string;
  AI_MODEL_API_URL?: string;
  AI_MODEL_NAME?: string;
  AI_MODEL_API_KEY?: string;
}
