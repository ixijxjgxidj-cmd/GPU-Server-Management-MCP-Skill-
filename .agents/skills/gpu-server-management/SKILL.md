---
name: gpu-server-management
description: Use when you need a GPU server to train, infer, or run any compute task — to connect to one, claim and release tasks with countdown timers, track server physical remaining lifespan, trigger intelligent dual-mode backups (outputs-only vs. full evacuation) with cloud RAG vector indexing, query cached data via query_backup_index / everything-mcp and Dataset Affinity, borrow disk from another machine, or route around a slow or blocked network. Also use when registering a server you just configured, or when an SSH connection to a known server fails.
---

# GPU Server Management

A shared registry that lets you **drive many remote machines as one pool**. The database is
**collective memory**: what one agent configures and records, every later agent reads back — so
setup work is never repeated and machines cooperate instead of being used one at a time.

**What this unlocks — the reason to reach for these tools:**

| Goal | Tool | In one line |
|------|------|-------------|
| **Dual Timers: Lease & Task** | `get_servers` / `claim_server` | Tracks 2 distinct timers: 1. Server physical lifespan remaining (`server_expires_at`) vs. 2. Task countdown lease (`duration_minutes`). |
| **Intelligent Dual-Mode Backup** | `plan_server_backup` | Physical remaining > 1h: only backup experiment outputs (exclude datasets to keep affinity); Physical remaining <= 1h: full asset evacuation. |
| **RAG Vector Search for Backups** | `query_backup_index` | Semantic natural-language / keyword RAG search across all historical checkpoints and backups (IP lifecycle-bound). |
| **Dataset Affinity (数据就近计算)** | `plan_task_allocation { preferred_datasets }` | Route jobs directly to nodes with pre-cached datasets (+100k score boost), avoiding huge network downloads. |
| **Manage Datasets** | `register_dataset` / `remove_dataset` | Record dataset paths & sizes so subsequent agents reuse local data paths without re-downloading. |
| **Borrow disk** | `plan_disk_share` | Mount a disk-rich machine onto one that ran out of space (turn a peer into a cloud disk). |
| **Route around a bad network** | `plan_network_relay` | Accelerate a slow/blocked download through a proxy, or relay the file via a healthy server. |
| **Teach the next agent** | `upsert_server { notes_entry }` | Write back what you set up (global proxy, CUDA env, mounts) so the next call returns it. |

---

## 🔄 The Standard 5-Step Agent Lifecycle

Every task session on a GPU machine MUST follow this 5-step loop:

1. **Read the pool & Dual Timers**: `get_servers` → check online status, free resources, `current_task` (is it busy?), `datasets`, and **`server_remaining_minutes` (物理剩余时间)** vs. **`task_remaining_minutes` (任务倒计时)**.
2. **Claim with optional Countdown**: 
   ```yaml
   claim_server {
     server_id: "...",
     agent: "<your-agent-name>",
     task: "<task-summary>",
     duration_minutes: 60  # 任务倒计时分钟数。不填或为 0 则不限时
   }
   ```
3. **Workspace Setup & Execution (工作区隔离与执行)**:
   - **必做前提**：连接到新服务器或开启新任务时，**必须首先创建专用隔离工作区**，命名规范为：
     `{session_name}_{agent_name}_{YYYYMMDD_HHMMSS}`
     ```bash
     # 例如：
     mkdir -p ~/workspace/train_lora_antigravity_20260815_140200
     cd ~/workspace/train_lora_antigravity_20260815_140200
     ```
   - **严格红线**：后续所有的代码拉取、环境运行、检查点输出、权重保存及中间过程文件，**必须全部且严格在该文件夹内部进行**，严禁在 `~` 或系统根目录散落文件，确保会话/Agent 间空间绝对隔离。
4. **Data Backup Protocol & Cloud RAG Indexing (`plan_server_backup`)**:
   - 当任务执行完毕或任务倒计时到期时，系统根据**物理服务器剩余存活时间**智能决策备份范围：
   ```yaml
   plan_server_backup {
     server_id: "...",
     session_name: "train_lora",
     summary: "checkpoint_epoch5",
     has_google_drive: true,        # 源服务器是否挂载 Google Drive
     remote_data_dir: "~/workspace/train_lora_antigravity_20260815_140200/output",
     data_purpose: "用于阶段性评估与部署",
     data_usage_status: "已完成 5 轮训练，验证集 loss 0.18"
   }
   ```
   - **【决策 A：服务器物理剩余时间 > 1 小时 或 永久机】**：
     - 说明机器短期不会关机回收，大型数据集依然安全存活；
     - **仅备份本轮实验核心产出（权重/检查点/日志/配置）**，**坚决不备份、不转移数据集**，数据集继续保留在机供后续任务享受 Dataset Affinity 亲和调度！
   - **【决策 B：服务器物理剩余时间 <= 1 小时 (临期关机/回收)】**：
     - 说明机器即将被云厂商关机或销毁，执行**全量资产疏散备份**：
       - **顺位 1·Google Drive**：全量备份至云盘，本地留存索引；
       - **顺位 2·集群对端服务器**：中转转移至长期存活节点并在对端自动调用 `register_dataset` 登记；本地仅留存【地址+连接方法+数据索引】；
       - **顺位 3·本地核心权重备份**：下载私有不可逆权重（过滤公开数据集与基座模型）。
   - **【MCP RAG 向量索引同步与 IP 生命周期绑定】**：所有备份自动以源机 IP 为唯一锚点上传至 MCP 数据库。**若某 IP 的服务器被删除，对应 IP 的所有历史备份索引将一同自动级联销毁**。
5. **Release the machine**: `release_server { server_id, agent: "<agent-name>", task_done: true }` → marks it idle for others.

---

## 🔍 数据检索与复用三级决策树 (Data Retrieval Hierarchy)

后续任何 Agent 需要某份数据、模型权重或检查点时，必须遵循以下 **三级检索优先级**：

```
[任务需要数据/模型权重]
       │
       ▼
【第 1 优先级：云端 RAG 向量索引 (query_backup_index) 与 本地备份目录检索 (everything-mcp)】
  调用 query_backup_index { query: "自然语言描述/指标/关键词" } 或 everything-mcp 搜索本地 severs_datas
       │
       ├─► 命中 Google Drive 备份:
       │    直接从 Google Drive 挂载/提取数据到目标机
       │
       ├─► 命中对端服务器中转备份:
       │    直接根据索引中的【服务器地址 + 连接方法】前往目标节点读取，
       │    或在 plan_task_allocation 中利用 Dataset Affinity (+10万分) 调度到该节点
       │
       ├─► 命中本地备份核心权重文件:
       │    直接使用本地数据，或 scp/rsync 上传至目标机
       │
       ▼ (未命中历史备份)
【第 2 优先级：集群服务器已有缓存 (高权重调度)】
  调用 get_servers 查看各节点的 datasets 目录与 notes_entries
       │
       ├─► 某服务器已缓存该数据:
       │    该节点调度权重最高 (plan_task_allocation 自动 +100,000 分 Dataset Affinity)
       │    直接调度任务到该服务器上执行，零数据拉取时间
       │
       ▼ (全池均无该数据)
【第 3 优先级：全池无数据 (低权重调度 + 远程拉取)】
  调度权重最低，使用 plan_network_relay 加速下载至目标服务器，
  并在下载后立即调用 register_dataset 登记该数据集
```

---

## 🛠 18 Tools in 4 Layers

### Layer 1 — Connect & Lifecycle (the default flow)

```yaml
get_servers {}                                                   # all online servers + current tasks + dual timers
get_servers { gpu_model: "NVIDIA A100", min_gpu_memory_gb: 40 }  # filtered
get_servers { include_offline: true }                            # also unreachable ones
```

One call returns everything needed to SSH in: `host`, `port`, `username`, `auth_method`,
`key_path`, `key_content_b64`, `password`, `connection_mode_label`, hardware, live load,
`server_expires_at`, `server_remaining_minutes`, `is_server_expiring_soon`,
`current_task`, `current_agent`, `task_started_at`, `task_duration_minutes`, `task_expires_at`, `task_remaining_minutes`, `is_task_expired`,
`datasets` (pre-cached data with absolute paths), `notes_entries`, `reachable_proxies`, plus a `how_to_connect` string.

### Layer 2 — Orchestrate multiple servers & Backups

| Need | Tool | Returns |
|------|------|---------|
| Start a task / claim server | `claim_server { server_id, agent, task, duration_minutes? }` | Marks server occupied, sets countdown lease if specified. |
| Finish a task / release server | `release_server { server_id, agent?, task_done?, note? }` | Clears occupancy and lease so server becomes idle again. |
| Plan intelligent backup | `plan_server_backup { server_id, session_name, summary, ... }` | Auto-decides outputs-only vs full-evacuation based on physical server lifespan >1h vs <=1h. Auto-syncs to MCP RAG DB. |
| RAG query backup indexes | `query_backup_index { query, backup_type?, server_host?, limit? }` | Semantic RAG ranking of all historical backups across cluster with remote paths, peer IP, connection commands, and match reasons. |
| Spread N tasks over machines | `plan_task_allocation { tasks: [{ id, gpu_count, min_gpu_memory_gb, min_ram_gb, min_disk_gb, min_cpu_cores, preferred_datasets: ["name"] }] }` | `recommended_allocation` table, `candidates_per_task` (ranked fallbacks with affinity indicators), `unassignable` with reasons, `stale_warnings` |
| Register a downloaded/mounted dataset | `register_dataset { server_id, name, path, size_gb? }` | Confirmation message. Adds to the server's dataset catalog for affinity routing. |
| Remove an unmounted/deleted dataset | `remove_dataset { server_id, name }` | Confirmation message. Removes dataset from catalog. |
| A machine is out of disk | `plan_disk_share { needy_server_id, need_gb, mode: "sshfs"\|"nfs"\|"both" }` | disk-rich reachable provider + mount commands |
| A machine's network is slow or blocked | `plan_network_relay { target_server_id, resource_url }` | proxy-acceleration commands and/or jump-relay steps |
| Load data is stale | `refresh_load { server_ids? }` | per-server probe commands + credentials |

### Layer 3 — Registry & Memory

| Tool | When |
|------|------|
| `claim_server` / `release_server` | Task lifecycle state transitions (busy <-> idle). |
| `upsert_server { host, ... }` | Register or update in one call, keyed by `host`. New servers also require `name`, `username`, `auth_method`. Pass `key_content` as **plaintext PEM** (the server base64-encodes it on read). |
| `register_dataset` / `remove_dataset` | Manage pre-cached datasets and directories on servers for Dataset Affinity. |
| `update_server { server_id, updates }` | Change fields by ID, including `enabled` (`1` visible / `0` hidden) and `server_expires_at`. |
| `remove_server` / `verify_server_connectivity` | Management and diagnostics (removing a server automatically cleans up all associated backup indexes by IP). |

---

## 🔒 Security & Cleanup Discipline

- **Dedicated Isolated Workspaces**: Always `mkdir -p ~/workspace/{session}_{agent}_{time}` upon SSH connection. Keep all files strictly inside this folder.
- **Dual-Timer Awareness**: Always monitor `server_remaining_minutes` (物理存活剩余) vs `task_remaining_minutes` (任务倒计时). If server physical lifespan <= 60 min, execute full evacuation backup immediately.
- **Always Backup & Release**: Never leave a server claimed after a task finishes or errors out. Always run `plan_server_backup` (if data produced) followed by `release_server`.
- **IP-Bound Memory**: All backup indexes are tied to server IP. Deleting a server automatically purges its backup index from RAG memory.
- **Never Print Keys**: Never print a decoded private key back into the conversation.
