export interface DBServer {
  id: string;
  name: string;
  provider?: string | null; // e.g. "AutoDL", "RunPod", "Vast.ai", "阿里云", "腾讯云", "恒源云", "自建机房"
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
  task_duration_minutes?: number | null; // Optional countdown duration in minutes
  task_expires_at?: string | null;       // When the task lease expires (ISO string)
  server_expires_at?: string | null;     // Physical server expiration/lease time (ISO string) or null if permanent
  notes: string | null;  // User remarks/notes about the server
  enabled: number;  // 1=enabled (visible to MCP), 0=disabled (hidden from MCP)
  ssh_banner: string | null;  // SSH server banner text
  os_hint: string | null;     // Detected OS type (Ubuntu, Debian, etc.)
  gpu_count: number | null;
  gpu_util_pct: number | null;
  gpu_mem_free_gb: number | null;
  ram_free_gb: number | null;
  disk_free_gb: number | null;
  running_tasks: number | null;
  load_updated_at: string | null;
  gpu_sharing_mode: 'shared' | 'exclusive'; // shared (default): meter GPU by free VRAM; exclusive: whole cards
  connection_type: 'standard' | 'cloudflare_tunnel'; // how SSH is reached; cloudflare_tunnel uses `cloudflared access ssh`
  python_version: string | null;   // e.g. "3.12.3"
  torch_version: string | null;    // e.g. "2.3.1+cu121"
  cuda_version: string | null;     // driver CUDA, e.g. "12.4"
  top_cpu_tasks: string | null;    // JSON array [{cpu:number, mem:number, cmd:string}] — live top-3 by CPU
  datasets?: string | null;        // JSON array [{name:string, path:string, size_gb:number}]
  mount_points?: string | null;    // JSON array [{mount:string, total_gb:number, free_gb:number, is_primary?:boolean, is_root?:boolean}]
  primary_data_dir?: string | null;// e.g. "/root/autodl-tmp" or "/workspace" or "/data"
  environments?: string | null;    // JSON array [{name:string, type:string, path:string, python_version?:string, torch_version?:string, cuda_version?:string, packages?:string[], activate_cmd?:string, is_primary?:boolean}]
  primary_env_cmd?: string | null; // e.g. "source /root/miniconda3/bin/activate base"
  is_jump_host?: number;           // 1 = jump host / bastion for status probe & SSH jump, 0 = normal server
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
  subscription_id?: string | null;
  region?: string | null;
  target_scores?: string | null; // JSON map: { "huggingface.co": { latency_ms: 120, speed_kbps: 5200 }, "github.com": { latency_ms: 80, speed_kbps: 8000 } }
  is_alive?: number; // 1=alive, 0=dead
  created_at: string;
  updated_at: string;
}

export interface DBProxySubscription {
  id: string;
  name: string;
  url: string;
  auto_refresh: number; // 1 or 0
  node_count: number;
  last_synced_at: string | null;
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

export interface DBBackupIndex {
  id: string;
  server_host: string;
  server_id: string | null;
  folder_name: string;
  session_name: string;
  summary: string;
  backup_type: 'google_drive' | 'peer_server' | 'local_weights';
  purpose: string | null;
  usage_status: string | null;
  remote_path: string;
  peer_server_host: string | null;
  peer_connect_cmd: string | null;
  metadata_json: string;
  search_text: string;
  embedding?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBServerNote {
  server_id: string;
  topic: string;
  content: string;
  provider?: string | null;
  is_shared?: boolean;
  source_server_name?: string;
  updated_by: string | null;
  updated_at: string;
}

export interface DBServerPitfall {
  id: string;
  server_id: string;
  provider?: string | null;   // 归属运营商
  is_shared?: boolean;        // 是否为同运营商共享的避坑沉淀
  source_server_name?: string;// 来源服务器名称
  source_server_host?: string;// 来源服务器主机
  title: string;              // 踩坑标题 (e.g. "PyTorch 与 CUDA 12.1 驱动兼容性问题")
  description: string;        // 踩坑详细现象 / 错误信息 / 表现特征
  workaround: string;         // 避坑方案 / 解决方案 / 建议规避指令
  severity?: 'info' | 'warning' | 'critical'; // 严重程度: info | warning (default) | critical
  tags?: string | null;       // JSON array (e.g. ["cuda", "torch", "oom"])
  agent?: string | null;      // 记录人/Agent标识
  created_at: string;
  updated_at: string;
}

export interface DBSystemSetting {
  key: string;
  value: string;
  updated_at: string;
}

// Types that include D1 result types
export interface Env {
  DB: D1Database;
  PING_API_KEY?: string;
  AI_MODEL_API_URL?: string;
  AI_MODEL_NAME?: string;
  AI_MODEL_API_KEY?: string;
  BRIDGE_TOKEN?: string;
  GDRIVE_SERVICE_ACCOUNT_JSON?: string;
  GDRIVE_ROOT_FOLDER_ID?: string;
}
