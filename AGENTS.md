# AGENTS.md - Multi-Agent Global Guidelines & Rules

> **Applicable Agents**: Antigravity, Claude Code, OpenAI Codex, Cursor, Windsurf, OpenCodeInterpreter  
> **Backend Service**: `gpu-mcp-server-cf`  
> **Skill**: `gpu-server-management`

---

## 🎯 Global Directives

1. **Always Use `get_servers` for Discovery**:
   - Never hardcode or guess SSH keys or server credentials.
   - Keys are returned in single-line Base64 format and survive context window compaction.
2. **Strict Workspace Isolation**:
   - All experimental code, logs, and artifacts must be placed in a dedicated project directory:  
     `mkdir -p ~/projects/{project_name}_{YYYYMMDD_HHMMSS}/`
   - Reusable datasets and model weights must be stored in the global shared directory:  
     `~/shared/datasets/`
   - Python dependencies (pip/conda) must be installed globally on the server so they persist across sessions.
3. **Execute the 6-Step Download Strategy**:
   - Step 1: Check Workers RAG index (`query_backup_index`) & local pre-cached datasets (`get_servers`).
   - Step 2: Search direct URL via `anysearch` / `search_web`.
   - Step 3: Run `plan_network_relay` Direct vs. Proxy concurrency speed race.
   - Step 4: For >500MB files, execute Multi-Proxy chunk-aggregated downloading.
   - Step 5: Fall back to local machine upload via `scp` if restricted.
   - Step 6: Always call `register_dataset` upon completion to populate collective memory.
4. **Mandatory Troubleshooting RAG Query**:
   - On encountering ANY error, exception, or failure, query the Troubleshooting RAG knowledge base first.
   - Apply the verified fix and record new lessons learned via `upsert_server`'s `notes_entry`.
5. **Honor Countdown Leases & Release Early**:
   - Always specify `duration_minutes` when calling `claim_server`.
   - Always call `release_server` as soon as the compute workload finishes.
