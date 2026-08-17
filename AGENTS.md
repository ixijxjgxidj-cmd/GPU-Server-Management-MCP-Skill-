# AGENTS.md - Multi-Agent Global Guidelines & Rules

> **Applicable Agents**: Antigravity, Claude Code, OpenAI Codex, Cursor, Windsurf, OpenCodeInterpreter  
> **Backend Service**: `dsh-mcp-server`  
> **Skills**: `gpu-server-management`, `cn-proxy-client`

---

## 🎯 Global Directives

1. **Always Use `get_servers` for Discovery**:
   - Never hardcode or guess SSH keys or server credentials.
   - For `auth_method: "key"`, keys are returned in single-line Base64 format (`key_content_b64`) and survive context window compaction.
   - For `auth_method: "password"`, plaintext passwords are explicitly provided in the `password` field (e.g. use `sshpass -p '<password>'` or `python scripts/sshrun.py --password '<password>'`), never treat it as missing credentials!
   - For `connection_type: "tunnel"` (内网穿透隧道), support Cloudflare Tunnel (`cloudflared access ssh`), tmate session tokens, and FRP tunnels automatically via returned ready-to-use commands.
2. **Strict Workspace Isolation & Primary Storage**:
   - All experimental code, logs, and artifacts must be placed in a dedicated project directory on the high-capacity volume (`primary_data_dir`):  
     `mkdir -p <primary_data_dir>/projects/{project_name}_{YYYYMMDD_HHMMSS}/` (never on small root `/`).
   - Reusable datasets and model weights must be stored in the shared directory:  
     `<primary_data_dir>/shared/datasets/` and `<primary_data_dir>/shared/models/`.
   - **Environment Reuse First**: Always activate the pre-configured `primary_env` via `ready_to_use_commands.env_activate`. Never recreate `.venv` or re-install PyTorch blindly. If a new environment is created, immediately call `register_environment` to register it into collective memory.
3. **数据与包获取三层状态机 (3-Tier Acquisition State Machine & CoT)**:
   - **思考链必填状态推导**: 寻找任何数据前，必须按 `[Tier 1 Check: Google Drive]` -> 若未命中输出 `[Tier 1 Miss -> Escalating to Tier 2]` -> `[Tier 2 Check: Relay/Cluster RAG]` -> 若未命中输出 `[Tier 2 Miss -> Tier 3 Fallback]` 格式推导。
   - **Tier 1 (最高优先级·首选)**: 调用 `list_gdrive_files` 检查 Google Drive，命中直接 `gdrive-pull`（国内自动走 sing-box 加速，海外直连）。
   - **Tier 2 (次优顺位)**: 调用 `query_backup_index` 检索 Workers RAG 向量池，命中中转机 (tor1 `159.203.15.86`) 或超算节点 (ZZAI) 时走机房千兆专线 `rsync` 极速拉取。
   - **Tier 3 (保底末位·受控)**: 仅在 Tier 1 & Tier 2 均显式返回 Miss 时，才允许本地物理机扫描并 `scp` 上传保底。
   - **公网开源资源获取**: 直链检索 -> 直连vs代理并发竞速 -> >500MB 多代理分片 -> 立即调用 `register_dataset` 登记。
4. **Mandatory Troubleshooting RAG Query**:
   - On encountering ANY error, exception, or failure, query the Troubleshooting RAG knowledge base first.
   - Apply the verified fix and record new lessons learned via `upsert_server`'s `notes_entry`.
5. **Honor Countdown Leases & Release Early**:
   - Always specify `duration_minutes` when calling `claim_server`.
   - Always call `release_server` as soon as the compute workload finishes.
6. **Deploying & Managing Outbound Proxies (`cn-proxy-client`)**:
   - When deploying or restoring sing-box proxies on rented CN GPU boxes (Deepln, VirtaiCloud, SCNet ZZAI, etc.), activate the `cn-proxy-client` skill.
   - Never route data paths through the local Windows machine; use remote relay (`tor1`) or direct dialing.
   - Upon completing proxy deployment, always call `update_server` and `upsert_server`'s `notes_entry` to register `v2ray_available: 1`, tags, and usage into collective memory to instantly unlock Google Drive integration!
7. **标准化自动补齐闭环执行链路与严禁消极阻断 (Strict Ban on Passive Blocking & Mandatory Autonomous Resolution)**:
   - **绝对红线**：缺少数据、缺权重、缺依赖包或显卡显存瓶颈，**永远不是停止任务（BLOCKED）的理由**！严禁在预检发现缺失时直接退出并下发“等待恢复”的白卷报告。预检的目的是立即自动补齐，不是找借口开脱。
   - **缺数据 / 权重 / 资产**：必须强制严格按三层状态机依次推进补全：
     `[Tier 1: Google Drive list_gdrive_files -> gdrive-pull]` ➔ 
     `[Tier 2: Workers RAG query_backup_index -> 中转机 tor1 / ZZAI 千兆 rsync]` ➔ 
     `[Tier 3: 官方源下载 / 本地 scp 兜底]` ➔ 
     拉取完毕立即调用 `register_dataset` 登记！
   - **缺环境 / 依赖包**：
     优先复用系统/Conda 解释器；若缺少指定库（如 `seisbench`, `obspy` 等），必须立即通过清华/阿里国内源直连高速补装（云服务器环境需带 `--break-system-packages` 并设 `TMPDIR=<primary_data_dir>/tmp` 防止爆系统盘），安装完成后立即调用 `register_environment` 固化进集体记忆，严禁以此为由拒绝执行！
   - **GPU 无法满足或显存瓶颈 (严格区分云服务器 vs 本地物理机)**：
     - **云服务器 / 容器环境 (Cloud GPU Box)**：
       若当前租用卡显存不足或算力受限，先**降级至 CPU 模式**（`device: cpu`）快速跑通数据切分、基线重放预检与逻辑打通；若需大规模训练/推理，立即调用 `get_servers` 调度符合显存的其他 GPU 节点，并在旧节点释放前完成数据产出备份 (`plan_server_backup`)，严禁在原地停摆！
     - **本地物理机环境 (Local Environment)**：
       本地无租期倒计时约束，直接利用本地 CPU/GPU 完成前置校验、轻量调试与数据集 manifest 生成，大规模训练任务由 `get_servers` 路由至远端集群。


