---
name: gpu-server-management
description: Use when you need a GPU server to train, infer, or run any compute task — to connect to one, claim and release tasks with countdown timers, track server physical remaining lifespan, execute the 6-step Server Download Strategy (Workers RAG -> anysearch/Cloudflare browser -> Direct vs Multi-Proxy speed benchmark & dynamic race -> Multi-Proxy chunk-aggregated downloading for >500MB -> local machine fallback upload -> register_dataset), query the unified Troubleshooting RAG knowledge base upon encountering ANY issue or error (query_troubleshooting), record and query server-specific pitfalls and caveats (record_pitfall / remove_pitfall / pitfalls memory in get_servers), import/manage Clash & V2Ray proxy subscriptions via import_proxy_subscription, trigger intelligent dual-mode backups (outputs-only vs. full evacuation) with cloud RAG vector indexing, query cached data via query_backup_index / everything-mcp and Dataset Affinity, borrow disk from another machine, or route around a slow or blocked network. Also use when registering a server you just configured, or when an SSH connection to a known server fails.
---

# GPU Server Management & Next-Gen Proxy Orchestration

A shared registry and high-performance multi-proxy orchestration engine that lets you **drive many remote GPU machines as one pool**. The database is **collective memory**: what one agent configures, discovers, or encounters (including pitfalls, troubleshooting workarounds, and server notes), every later agent reads back — so setup work is never repeated and machines cooperate seamlessly.

**What this unlocks — the reason to reach for these tools:**

| Goal | Tool | In one line |
|------|------|-------------|
| **遇错优先查询·RAG 问题库** | `query_troubleshooting { query }` | **【遇到报错第一顺位调用】** 秒级语义检索全集群所有踩坑经验 (pitfalls)、节点备忘 (notes) 与备份索引，返回已验证的解决方案与执行命令。 |
| **Dual Timers: Lease & Task** | `get_servers` / `claim_server` | Tracks 2 distinct timers: 1. Server physical lifespan remaining (`server_expires_at`) vs. 2. Task countdown lease (`duration_minutes`). |
| **Server Pitfalls & Caveats (踩坑与避坑记忆)** | `record_pitfall` / `get_servers` | Records environment traps, PyTorch/CUDA conflicts, OOM mitigations, and network quirks per server, auto-returned on every `get_servers` call. |
| **Clash & V2Ray Subscriptions** | `import_proxy_subscription` | Auto-fetches and parses Clash YAML / Base64 subscriptions, batch-populating proxy nodes with region tags (HK/JP/US/SG). |
| **Domain-Aware Routing & Racing** | `plan_network_relay` | Domain profiling (HuggingFace / GitHub / S3) + Direct vs Multi-Proxy concurrent Range benchmark (哪个快选哪个). |
| **Multi-Proxy Chunk Aggregator** | `plan_network_relay` | For >500MB large weights/datasets, splits into 64MB chunks across multiple proxies in parallel with auto-failover and resume. |
| **Intelligent Dual-Mode Backup** | `plan_server_backup` | Physical remaining > 1h: only backup experiment outputs (exclude datasets to keep affinity); Physical remaining <= 1h: full asset evacuation. |
| **RAG Vector Search for Backups** | `query_backup_index` | Semantic natural-language / keyword RAG search across all historical checkpoints and backups (IP lifecycle-bound). |
| **Dataset Affinity (数据就近计算)** | `plan_task_allocation { preferred_datasets }` | Route jobs directly to nodes with pre-cached datasets (+100k score boost), avoiding huge network downloads. |
| **Manage Datasets** | `register_dataset` / `remove_dataset` | Record dataset paths & sizes so subsequent agents reuse local data paths without re-downloading. |
| **Borrow disk** | `plan_disk_share` | Mount a disk-rich machine onto one that ran out of space (turn a peer into a cloud disk). |
| **Unified Proxy Environment** | `plan_network_relay` | One-shot script (`proxy_env.sh`) wrapping Shell, Git, Pip, Python, and HuggingFace fast transfer variables. |

---

## 🔄 The Standard 5-Step Agent Lifecycle

Every task session on a GPU machine MUST follow this 5-step loop:

1. **Read the pool, Pitfalls & Dual Timers**: `get_servers` → check online status, free resources, `current_task` (is it busy?), `datasets`, **`pitfalls` (必须查阅前人沉淀的避坑指南与环境陷阱)**, and **`server_remaining_minutes` (物理剩余时间)** vs. **`task_remaining_minutes` (任务倒计时)**.
2. **Claim with optional Countdown**: 
   ```yaml
   claim_server {
     server_id: "...",
     agent: "<your-agent-name>",
     task: "<task-summary>",
     duration_minutes: 60  # 任务倒计时分钟数。不填或为 0 则不限时
   }
   ```
3. **Project Folder Creation, Global Environment & Shared Assets Hierarchy (新建项目文件夹、主数据盘定位、环境复用与公共资产管理)**:
   - **📁【新建项目文件夹 (必须建立在 primary_data_dir 主数据盘)】**：
     - 每次调用服务器做一次实验，**必须首先在 primary_data_dir 下建立专属项目文件夹**（严禁建在小容量系统根分区 `/root` 下，防止磁盘爆满）：
     `<primary_data_dir>/projects/{project_name}_{YYYYMMDD_HHMMSS}/`
     ```bash
     mkdir -p <primary_data_dir>/projects/train_lora_20260815_140200/src <primary_data_dir>/projects/train_lora_20260815_140200/output <primary_data_dir>/projects/train_lora_20260815_140200/logs
     cd <primary_data_dir>/projects/train_lora_20260815_140200
     ```
     - **边界与规范**：本次实验专属的业务工程代码、执行脚本、训练 checkpoint、评测日志及指标产出，**全部保存在该项目文件夹内部**。
   - **🌐【环境复用第一定律 (使用 primary_env 与 env_activate，严禁重复建 venv / 重复重装)】**：
     - `get_servers` 已自动探查全机所有物理挂载盘及 Conda/Venv 环境，返回 `primary_env` 与 `ready_to_use_commands.env_activate`；
     - **直接激活复用**：连接后首先执行 `ready_to_use_commands.env_activate`（或直接使用 `run_with_env` 指定解释器路径）；
     - **严禁在项目文件夹重复创建 .venv 和反复重装 PyTorch/CUDA 等大依赖**，确保一次安装、全机所有后续实验与不同 Agent 永久直接复用！
     - **新环境主动沉淀**：若必须配置全新虚拟环境，配好后**必须立即调用 `register_environment`** 将其永久登记进集体记忆：
       ```yaml
       register_environment {
         server_id: "...",
         name: "vllm_cu124",
         path: "<primary_data_dir>/conda/envs/vllm/bin/python",
         type: "conda",
         python_version: "3.10.14",
         torch_version: "2.4.0+cu124",
         cuda_version: "12.4",
         packages: ["vllm", "transformers", "flash_attn"],
         activate_cmd: "conda activate vllm"
       }
       ```
   - **📦【公共数据集与模型权重独立全局存储】**：
     - 下载的大型数据集与基座模型权重必须存放于**单独的全局共享目录**：
       - 数据集全局目录：`<primary_data_dir>/shared/datasets/<dataset_name>/`（下载后立即调用 `register_dataset` 登记至集群记忆）
       - 模型权重全局目录：`<primary_data_dir>/shared/models/<model_name>/` 或 HuggingFace 默认全局缓存 `~/.cache/huggingface/`
     - 实验代码通过绝对路径或软链接直接引用全局数据集与基座模型，绝不把巨型数据和权重塞进单次实验的项目文件夹！
   - **🔍【环境就地探测与差异清单排查】**：
     1. **探测已有环境**：查看 `get_servers` 返回的 `environments` 清单，并在终端确认：
        ```bash
        which python3; which conda; nvidia-smi
        python3 -c "import torch; print(torch.__version__, 'CUDA:', torch.cuda.is_available())"
        ```
     2. **列出缺失清单 (Diff)**：对照任务需求，**精准仅列出服务器当前真正缺失的依赖包**，已有可用依赖坚决不重复重装！
     3. **最优增量安装**：针对缺失依赖，对比直连国内镜像源 (清华/中科大/阿里) 与服务器本机本地代理 (/etc/profile.d/00-proxy.sh) 测速，全局增量安装 (`pip install --break-system-packages <pkg>`)。
   - **⚠️ 遇到新坑立即沉淀**：若在配置环境、运行代码、驱动调用、网络拉取或挂载时遇到特殊报错/版本冲突并摸索出避坑方法，**必须立即调用 `record_pitfall` 将其永久固化进集体记忆**：
     ```yaml
     record_pitfall {
       server_id: "...",
       title: "PyTorch 2.4 与 CUDA 12.1 驱动不兼容导致的 Segfault",
       description: "直接使用 pip install torch 默认安装 2.4 会触发 cuda runtime crash",
       workaround: "pip install torch==2.3.1+cu121 --extra-index-url https://download.pytorch.org/whl/cu121 --break-system-packages",
       severity: "critical"
     }
     ```
4. **Data Backup Protocol & Cloud RAG Indexing (`plan_server_backup`)**:
   - 当任务执行完毕或任务倒计时到期时，系统根据**物理服务器剩余存活时间**智能决策备份范围：
   ```yaml
   plan_server_backup {
     server_id: "...",
     session_name: "train_lora",
     summary: "checkpoint_epoch5",
     has_google_drive: true,        # 源服务器是否挂载 Google Drive
     remote_data_dir: "~/projects/train_lora_20260815_140200/output",
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
    - **【本地出海代理感知与 Google Drive 互联铁律】**：
      - **代理部署感知**：`get_servers` 针对每台机器返回 `local_proxy_deployed: true/false`、`local_proxy_type` (如 sing-box/v2ray/clash)、`local_proxy_usage` (具体用法如 `source /etc/profile.d/00-proxy.sh`) 与 `is_china_mainland`。
      - **国内节点 + 已配代理 (如 sing-box / 127.0.0.1:10809)**：Google Drive 自动走 sing-box 代理通道，`ready_to_use_commands.gdrive_setup` 自动注入代理配置。
      - **国内节点 + 未配代理**：Google Drive **强制禁用 (`google_drive_enabled: false`)**，命令提示为 `echo "❌ 该服务器位于中国大陆且未部署本地出海代理 (如 sing-box)，Google Drive 已禁用。请先使用配套 skill 'cn-proxy-client' 部署出海代理方可使用 Google Drive。"`。
      - **海外节点**：Google Drive 默认直连高速读写。
      - **一键配置命令**（在任何支持的节点秒级初始化 rclone + 凭据）：
        ```bash
        curl -fsSL https://dsh-mcp-server.hulkcheng0806.workers.dev/api/gdrive/setup.sh | bash
        ```
      - **原生同步指令**（多线程并发 + 断点续传）：
        - 上传产物：`gdrive-push <本地文件或文件夹> [云端子目录]`（例如 `gdrive-push ./output/best.pt`）
        - 拉取数据：`gdrive-pull <云端文件路径> [本地目标目录]`
        - 查看文件：`gdrive-ls [子目录]`
      - **实时云端感知**：上传后任何 Agent 可调用 `list_gdrive_files { query: "..." }` 实时检索，Web 仪表盘同步可见。
    - **【MCP RAG 向量索引同步与 IP 生命周期绑定】**：所有备份自动以源机 IP 为唯一锚点上传至 MCP 数据库。**若某 IP 的服务器被删除，对应 IP 的所有历史备份索引将一同自动级联销毁**。
5. **Release the machine**: `release_server { server_id, agent: "<agent-name>", task_done: true }` → marks it idle for others.

---

## 📥 数据、权重与依赖获取三层状态机 (3-Tier Acquisition State Machine)

> 🔒 **【核心边界与 SOCKS5 专用铁律】**：  
> 集群 SOCKS5 代理池 (`reachable_proxies` / `proxy_acceleration.ready_to_use_commands.ssh_proxy_jump`) **仅专门用于 SSH 跳板连接与端口穿透**。  
> **严禁将 SOCKS5 代理池用于任何服务器下载、pip 安装或数据集拉取任务！**  
> **严禁 SSH 本机隧道端口**  
> 下载测速对比仅限于：**直连/国内镜像源** vs **服务器本机已配置好的本地代理环境 (如本机 127.0.0.1 代理或 /etc/profile.d/00-proxy.sh)**。

当服务器需要定位或拉取任何数据集、模型权重、历史产出或依赖包时，所有 Agent **必须严格执行以下不可跳步的三层状态机 (3-Tier Escalation State Machine)**：

### 🤖 必须遵循的思考链规范 (Mandatory CoT Template)
在寻找任何数据/包之前，Agent 必须在思考链中按如下状态格式进行推导记录：
```
[Data Discovery State Machine]
1. 目标资产：<数据集名称/权重/包名>
2. [Tier 1 Check]: 调用 list_gdrive_files { query: "<关键词>" } 检查 Google Drive 云端...
   ├─► 若命中: 执行 gdrive-pull 并终止状态机
   └─► 若未命中: 输出 [Tier 1 Miss: Google Drive not found, escalating to Tier 2]
3. [Tier 2 Check]: 调用 query_backup_index { query: "<关键词>" } 语义检索集群/中转机 RAG 索引...
   ├─► 若命中: 复制 rsync 指令从对端节点/中转机 (tor1) 高速拉取并终止状态机
   └─► 若未命中: 输出 [Tier 2 Miss: Relay/Cluster RAG not found, escalating to Tier 3]
4. [Tier 3 Fallback]: 仅在前两层均显式返回 Miss 时，才允许本地扫描并 scp 上传保底。
```

---

```
[服务器缺少数据 / 权重 / 项目依赖]
       │
       ▼
【第 1 层状态：Google Drive 云端提取 (Tier 1 Gate)】
  • 动作：调用 list_gdrive_files { query: "..." } 或在终端执行 gdrive-ls
  • 判定：
    ├─► 🟢 命中目标数据: 直接执行 gdrive-pull <云端路径> [本地目标目录] ➔ 状态机结束
    └─► 🔴 未命中: 状态机强制升级 (Escalate) 至【第 2 层状态】
       │
       ▼
【第 2 层状态：中转服务器 (tor1) 与集群对端 RAG 检索 (Tier 2 Gate)】
  • 动作：调用 query_backup_index { query: "自然语言描述/指标/数据集名" } 检索 Cloudflare Workers RAG 向量池
  • 判定：
    ├─► 🟢 命中中转机 (tor1 159.203.15.86: /mnt/volume_tor1_*) 或超算存储 (ZZAI: /root/private_data/):
    │     直接执行机房千兆专线 rsync 高速拉取 (零本地等待) ➔ 状态机结束
    └─► 🔴 未命中: 状态机强制升级 (Escalate) 至【第 3 层状态】
       │
       ▼
【第 3 层状态：本地物理机中转上传 (Tier 3 Fallback)】
  • 前置条件：仅当 Tier 1 (Google Drive) 与 Tier 2 (中转机/集群 RAG) 均已检索并确认无此数据时放行！
  • 动作：在本地物理机完成准备，通过 scp -P <port> 上传至服务器共享目录 ~/shared/datasets/
       │
       ▼ (若三层私有缓存均无，需从公网拉取开源资产)
【公网开源资源获取流水线】：
  1. 网络检索直链 (anysearch / search_web / Cloudflare Browser)
  2. 直连 vs. 本地出海代理 (127.0.0.1:10809) 并发测速竞速 (哪个快选哪个)
  3. >500MB 大文件走 multi_proxy_downloader.py 多通道分片并发聚合
  4. 成功拉取后必须立即调用 register_dataset 登记进集体记忆！
```

---

## 🚨 遇错排查第一顺位：RAG 问题库查询 SOP (Query Troubleshooting First)

在 GPU 服务器上执行任何任务时（无论配置环境、运行代码、下载模型、安装依赖或进行网络代理），**只要遇到任何报错、异常中断或未知问题，必须严格执行以下排错 SOP**：

```
[在服务器遇到报错 / 异常 / 冲突 / 阻断]
                    │
                    ▼
【第 1 步：强制第一顺位调用 MCP RAG 问题库】
  严禁盲目尝试或猜测修复！
  必须立即调用 query_troubleshooting 工具进行跨服务器语义检索：
  query_troubleshooting {
    query: "<将终端关键报错信息、异常日志、组件名复制作为 query>"
  }
  • 系统将聚合全集群：
    1. server_pitfalls (历史所有已验证的避坑指南与具体修复命令)
    2. servers.notes & server_notes (机器特有环境/容器限制/挂载/网络备忘)
    3. backup_indexes (数据集与实验产出路径)
                    │
                    ▼
【第 2 步：匹配度判定与直接采纳】
  ├─► 命中高匹配条目 (Score 显著):
  │    直接执行 proven_workaround_or_solution 中给出的已验证方案与命令！
  │    (避免重复排错耗时，秒级恢复生产)
  └─► 未命中任何历史条目 (全新未知问题):
       继续进行技术排查与网络检索 (search_web / anysearch)，直至问题彻底解决。
                    │
                    ▼
【第 3 步：解决后立即沉淀集体记忆】
  一旦探明原因并解决全新问题，必须立即调用：
  record_pitfall {
    server_id: "<当前服务器 ID>",
    title: "<简述报错与问题核心>",
    description: "<详细现象、触发场景与错误日志>",
    workaround: "<经实测验证的正确解决命令与避坑配置>",
    severity: "critical" | "warning" | "info"
  }
  将避坑方案永久写入集体记忆库，后续任何 Agent 遇错查询均可直接受益！
```

---

## 🛠 22 Tools in 4 Layers

### Layer 1 — Connect, Troubleshooting & Lifecycle (the default flow)

```yaml
# 1. 遇到任何报错第一顺位调用
query_troubleshooting { query: "CUDA out of memory in DataLoader" }

# 2. 查询服务器资源与自包含连接信息
get_servers {}                                                   # all online servers + pitfalls + current tasks + dual timers
get_servers { gpu_model: "NVIDIA A100", min_gpu_memory_gb: 40 }  # filtered
get_servers { include_offline: true }                            # also unreachable ones
```

One call returns everything needed to SSH in: `host`, `port`, `username`, `auth_method`,
`key_path`, `key_content_b64`, `password`, `connection_mode_label`, hardware, live load,
`server_expires_at`, `server_remaining_minutes`, `is_server_expiring_soon`,
`current_task`, `current_agent`, `task_started_at`, `task_duration_minutes`, `task_expires_at`, `task_remaining_minutes`, `is_task_expired`,
`datasets` (pre-cached data with absolute paths), `provider` (运营商名称), **`pitfalls`** (全套避坑经验列表: title, description, workaround, severity, is_shared, source_server_name, provider), `pitfalls_count`,
`notes_entries` (含同运营商共享笔记), `reachable_proxies`,
plus **`proxy_acceleration`** (遇到需要代理时自动返回的极速套件：`best_proxy` 最低延迟代理、`ready_to_use_commands.ssh_proxy_jump` SSH跳板命令、`ready_to_use_commands.shell_env_export` 环境变量接管、`git_proxy`、`pip_proxy`、`hf_fast_transfer`) 和 `how_to_connect` 字符串。无需手动拼接代理或查找节点，直接执行返回的命令即可！

### Layer 2 — Orchestrate multiple servers, Troubleshooting & Next-Gen Proxies

| Need | Tool | Returns |
|------|------|---------|
| **遇错优先排错查询 (RAG)** | `query_troubleshooting { query, server_id?, category?, limit? }` | 聚合全集群及同运营商 (Provider) 的 pitfalls、notes 与备份的语义 RAG 排错结果，秒级返回已验证的解决方案与执行命令。 |
| Start a task / claim server | `claim_server { server_id, agent, task, duration_minutes? }` | Marks server occupied, sets countdown lease if specified. |
| Finish a task / release server | `release_server { server_id, agent?, task_done?, note? }` | Clears occupancy and lease so server becomes idle again. |
| Record / sync a pitfall caveat | `record_pitfall { server_id, title, description, workaround, severity? }` | Persists environment traps, PyTorch/CUDA issues, and exact fix commands into collective memory, auto-returned and shared across all servers of the same provider. |
| Remove obsolete pitfall | `remove_pitfall { pitfall_id }` | Removes outdated/resolved pitfall from collective memory. |
| Import Clash/V2Ray Subscription | `import_proxy_subscription { url, name?, raw_content? }` | Auto-parses Clash YAML/Base64 nodes, batch populating proxy table with region detection. |
| Plan intelligent backup | `plan_server_backup { server_id, session_name, summary, ... }` | Auto-decides outputs-only vs full-evacuation based on physical server lifespan >1h vs <=1h. Auto-syncs to MCP RAG DB. |
| RAG query backup indexes | `query_backup_index { query, backup_type?, server_host?, limit? }` | Semantic RAG ranking of all historical backups across cluster with remote paths, peer IP, connection commands, and match reasons. |
| Google Drive cloud files | `list_gdrive_files { query?, folder_id?, page_size?, include_quota? }` | Real-time querying & browsing of Google Drive archived backups, checkpoints (best.pt), and experiment outputs. |
| Download & network relay | `plan_network_relay { target_server_id, resource_url }` | Outputs target domain profile, Direct vs Proxy speed benchmark script, Multi-Proxy Chunk Aggregator python script, Unified proxy env wrapper, and local upload fallback. |
| Spread N tasks over machines | `plan_task_allocation { tasks: [{ id, gpu_count, min_gpu_memory_gb, min_ram_gb, min_disk_gb, min_cpu_cores, preferred_datasets: ["name"] }] }` | `recommended_allocation` table, `candidates_per_task` (ranked fallbacks with affinity indicators), `unassignable` with reasons, `stale_warnings` |
| Register a downloaded/mounted dataset | `register_dataset { server_id, name, path, size_gb? }` | Confirmation message. Adds to the server's dataset catalog for affinity routing. |
| Remove an unmounted/deleted dataset | `remove_dataset { server_id, name }` | Confirmation message. Removes dataset from catalog. |
| **Register / Persist Environment** | `register_environment { server_id, name, path, python_version?, torch_version?, cuda_version?, packages?, activate_cmd?, is_primary? }` | 将服务器挂载盘上的 Conda/Venv 虚拟环境固化进集体记忆，返回激活命令。 |
| Remove obsolete environment | `remove_environment { server_id, name }` | 移除已删除或废弃的环境记录。 |
| A machine is out of disk | `plan_disk_share { needy_server_id, need_gb, mode: "sshfs"\|"nfs"\|"both" }` | disk-rich reachable provider + mount commands |
| Load data is stale | `refresh_load { server_ids? }` | per-server probe commands + credentials |

### Layer 3 — Registry & Memory

| Tool | When |
|------|------|
| `query_troubleshooting` | **遇错排查第一顺位**：语义检索所有踩坑、备注与备份（同运营商自动共享与加权）。 |
| `claim_server` / `release_server` | Task lifecycle state transitions (busy <-> idle). |
| `record_pitfall` / `remove_pitfall` | Collective memory management for caveats, environment quirks, and fix workarounds. |
| `register_environment` / `remove_environment` | 跨会话环境持久化：固化 Conda/Venv 虚拟环境与激活命令，防失忆重装。 |
| `import_proxy_subscription` | Ingest and refresh proxy subscriptions. |
| `upsert_server { host, provider?, connection_type?, ... }` | 登记或更新服务器，`host` 为去重键。新建服务器需包含 `name`, `username`, `auth_method`。`connection_type` 可选 `standard` (标准SSH直连/SOCKS5跳板) 或 `tunnel` (🚇 内网穿透隧道: 支持 Cloudflare Tunnel / tmate / FRP 自动解析)。传入 `provider` 可跨节点自动共享避坑经验与专题笔记。 |
| `register_dataset` / `remove_dataset` | Manage pre-cached datasets and directories on servers for Dataset Affinity. |
| `update_server` / `remove_server` | Change fields or delete servers (deletion cascades to all backup indexes by IP). |

---

## 🔒 Security & Cleanup Discipline

- **Dedicated Project Folders on Primary Mount**: Always `mkdir -p <primary_data_dir>/projects/{project_name}_{YYYYMMDD_HHMMSS}/` upon SSH connection. Keep experiment-specific code, configs, logs, and outputs strictly inside this folder on the high-capacity volume.
- **Global Environment & Shared Storage**: Check `primary_env` and use `ready_to_use_commands.env_activate` upon connection. Never blindly re-install PyTorch or create redundant `.venv` folders. Register new environments via `register_environment`. Store large datasets in `<primary_data_dir>/shared/datasets/` and model weights in `<primary_data_dir>/shared/models/`.
- **Dual-Timer Awareness**: Always monitor `server_remaining_minutes` (物理存活剩余) vs `task_remaining_minutes` (任务倒计时). If server physical lifespan <= 60 min, execute full evacuation backup immediately.
- **Always Backup & Release**: Never leave a server claimed after a task finishes or errors out. Always run `plan_server_backup` (if data produced) followed by `release_server`.
- **IP-Bound Memory**: All backup indexes are tied to server IP. Deleting a server automatically purges its backup index from RAG memory.
- **Never Print Keys**: Never print a decoded private key back into the conversation.

---

## 🚫 严禁消极阻断与标准化自动补齐闭环执行链路 (Strict Ban on Passive Blocking & Mandatory Autonomous Resolution — 云服务器环境专属)

> **适用范围声明**：**本地项目不设此思维链，本套思维链与闭环执行链路强行绑定云服务器/容器环境（Cloud Server Environment）**。

1. **绝对红线：缺少数据/环境/卡不是停止的理由**：
   - 严禁在预检发现远端缺少环境依赖、权重、代码仓库或数据集时直接声明「BLOCKED 阻断并停止」！
   - 预检的目的永远是「查漏补缺并立即自动补齐」，绝对不是「找借口开脱并释放算力」。

2. **标准化自动补齐闭环执行链路**：
   - **缺数据 / 权重 / 资产**：必须强制严格按三层状态机依次推进补全：
     `[Tier 1: Google Drive list_gdrive_files -> gdrive-pull]` ➔ 
     `[Tier 2: Workers RAG query_backup_index -> 中转机 tor1 / ZZAI 千兆 rsync]` ➔ 
     `[Tier 3: 官方源下载 / 本地 scp 兜底]` ➔ 
     拉取完毕立即调用 `register_dataset` 登记！
   - **缺环境 / 依赖包**：
     优先复用系统/Conda 解释器；若缺少指定库（如 `seisbench`, `obspy` 等），必须立即通过清华/阿里国内源直连高速补装（云服务器环境需带 `--break-system-packages` 并设 `TMPDIR=<primary_data_dir>/tmp` 防止爆系统盘），安装完成后立即调用 `register_environment` 固化进集体记忆，严禁以此为由拒绝执行！
   - **GPU 无法满足或显存瓶颈**：
     若当前租用卡显存不足或算力受限，先**降级至 CPU 模式**（`device: cpu`）快速跑通数据切分、基线重放预检与逻辑打通；若需大规模训练/推理，立即调用 `get_servers` 调度符合显存的其他 GPU 节点，并在旧节点释放前完成数据产出备份 (`plan_server_backup`)，严禁在原地停摆！

3. **交付产出导向**：
   - 任务必须输出实际的重放指标、切分数据 manifest 或阶段产物，严禁提交没有任何执行产出的空白阻断日志。


