# CLAUDE.md - GPU Server Management MCP & Cluster Protocol

> **Target Platform**: Cloudflare Workers + Cloudflare D1 Database + Streamable HTTP MCP (JSON-RPC 2.0)  
> **Skill Name**: `gpu-server-management`  
> **Server Name**: `gpu-mcp-server-cf`

---

## 🚀 Quick Development & Deployment Commands

```bash
# 进入 Worker 项目目录
cd gpu-mcp-server-cf

# 本地调试
npm run dev

# 编译类型检查
npx tsc --noEmit

# 部署到 Cloudflare Workers
npm run deploy  # 或 npx wrangler deploy

# 应用 D1 数据库迁移 (远程生产库)
npx wrangler d1 migrations apply DB --remote

# 运行单元测试
npm test
```

---

## 🏛 系统架构与目录规范

- **`gpu-mcp-server-cf/`**: Cloudflare Workers 后端核心源码
  - `src/index.ts`: Hono 应用入口与路由分发 (`/mcp`, `/api/*`, `/`)
  - `src/mcp/`: 18 个 MCP 工具的 schema 与执行处理器
  - `src/db/`: D1 数据库 schema、SQL 迁移脚本与查询封装
  - `src/api/`: REST API（服务器、代理池、NVIDIA NIM、排错知识库、状态探针）
  - `src/frontend/html.ts`: 响应式 Web 控制台单文件前端（HTML/CSS/JS）
- **`.agents/skills/gpu-server-management/`**: Agent 技能指令集与最佳实践

---

## 🛠 18 个核心 MCP 工具一览

| 分类 | 工具名称 | 作用 |
|---|---|---|
| **连接与生命周期** | `get_servers` | 获取可用节点列表、Base64 密钥、实时负载、预存数据集、倒计时、跳板机标识及避坑经验 (`pitfalls`) |
| | `claim_server` | 声明占用服务器，锁定任务并设定倒计时租期 (`duration_minutes`) |
| | `release_server` | 任务完成或异常退出后主动释放算力 |
| **调度与智能备份** | `plan_server_backup` | 双模智能分流备份（充足期仅备产出 vs. 临期全量撤离），自动同步 MCP RAG 向量库 |
| | `query_backup_index` | 自然语言/指标关键词 RAG 检索历史备份记录（绑定 IP 生命周期） |
| | `plan_task_allocation` | 多任务多维装箱调度（数据集亲和性 `Dataset Affinity` 享 **+100,000 分置顶**） |
| | `register_dataset` | 登记服务器已缓存的数据集路径与大小，写入集群集体记忆 |
| | `remove_dataset` | 移除已删除或卸载的数据集元数据记录 |
| | `plan_disk_share` | 磁盘不足时计算并生成 `sshfs`/`nfs` 跨机挂载指令 |
| | `plan_network_relay` | 生成直连 vs. 代理并发毫秒测速竞速脚本与 >500MB 分片聚合拉取命令 |
| | `refresh_load` | 下发实时物理负载探测命令 (`nvidia-smi`, `free`, `df`) |
| **注册与集体记忆** | `upsert_server` | 注册/更新服务器（以 host 唯一去重），写回运维避坑笔记 (`notes_entry`) 与跳板机开关 |
| | `update_server` | 修改服务器字段（包含 `is_jump_host`、上下架状态等） |
| | `remove_server` | 永久移除服务器（级联清理该 IP 下关联的所有备份索引） |
| **诊断与代理池** | `verify_server_connectivity` | 测试直连 SSH 与代理可达性 |
| | `import_proxy_subscription` | 一键导入 Clash/V2Ray 订阅链接，自动解析批量录入代理池 |
| | `list_proxies` | 列出当前配置的所有 SOCKS5 / HTTP 代理节点 |
| | `add_proxy` | 添加单个代理节点 |
| | `remove_proxy` | 移除失效代理节点 |

---

## 🔄 Claude Code 必须遵循的 5 步标准生命周期 SOP

在调用服务器执行任何计算任务时，**严格按顺序执行以下 5 步**：

```
1. 查池与避坑 (get_servers)
   → 检查空闲 GPU/显存、datasets 本地缓存、pitfalls 避坑列表与到期倒计时
2. 声明占用 (claim_server)
   → claim_server { server_id, agent: "Claude Code", task: "任务简述", duration_minutes: 120 }
3. 创建独立项目文件夹 (mkdir -p ~/projects/{project}_{time}/)
   → 实验专属代码、配置、日志及产出全部存放在项目文件夹内
   → 数据集与模型权重存放在全局目录 ~/shared/datasets/
   → Conda / Pip 环境全局安装生效
4. 智能双模备份与 RAG 入库 (plan_server_backup)
   → 剩余物理寿命 >1h: 仅备份项目产出 (outputs-only)，保留数据集供 Dataset Affinity 复用
   → 剩余物理寿命 <=1h: 全量资产撤离 (Google Drive / 对端机器同步)
5. 任务结束主动释放 (release_server)
   → release_server { server_id, agent: "Claude Code", task_done: true }
```

---

## 📥 服务器 6 步下载与数据获取全流程策略

当服务器需要下载外部资源（数据集、模型权重、依赖包、源码或配置）时，**严格按以下 6 步递进策略执行**：

1. **检索 Workers RAG 与集群缓存**：调用 `query_backup_index` 及 `get_servers` 查看各节点 `datasets` 缓存；
2. **网络检索获取真实下载直链**：使用检索工具获取 HuggingFace/ModelScope/GitHub 的 Direct URL；
3. **直连 vs. 代理 并发测速竞速 (哪个快选哪个)**：
   - 运行 `plan_network_relay` 测速脚本，对直连通道与各个代理节点同时进行 5 秒同源测速；
   - 直连更快则直接直连下载；某代理更快则 `export ALL_PROXY="$BEST_PROXY"` 加速下载；
4. **>500MB 超大文件多代理分片并发聚合拉取**：切分为 64MB/Chunk 分配给多个代理同时拉取合并，榨干全部代理带宽；
5. **本地物理机下载并中转上传 (保底机制)**：若公网受限或需私有认证，本地下载后 `scp` 上传至 `~/shared/datasets/`；
6. **必须执行·数据集就地登记 (`register_dataset`)**：下载完成后必须立即登记到集群记忆，供后续任务亲和调度！

---

## 🧠 统一排错与踩坑沉淀规范 (Troubleshooting RAG)

- **遇到任何报错时**：优先调用知识库搜索接口或在 `get_servers` 的 `pitfalls` 字段中查找已知方案；
- **解决新问题后**：通过 `upsert_server` 的 `notes_entry` 字段写回踩坑记录，例如：
  `[PITFALL: 2026-08-15] 现象: FlashAttention 编译报错 | 根因: CUDA 与 PyTorch 版本不匹配 | 解决: pip install flash-attn --no-build-isolation`。

---

## 🔀 跳板机与堡垒机探针机制 (`is_jump_host`)

- 当目标 GPU 服务器位于内网或受防火墙限制时，先连接配置了 `is_jump_host: true` 的跳板机；
- 由跳板机代执行探针命令或建立 SSH 端口转发隧道 (`ssh -J jump_user@jump_ip`)。
