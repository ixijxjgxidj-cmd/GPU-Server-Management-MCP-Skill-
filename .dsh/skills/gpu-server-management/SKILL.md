---
name: gpu-server-management
description: Use when you need a GPU server to run training or inference. Call the dsh-mcp-server MCP once to get all servers plus ready-to-use connection info (host, credentials, base64 SSH key, proxies).
---

# GPU Server Management via MCP

Goal: whenever you need a GPU server, call **one** MCP tool and immediately have everything you need to SSH in. No multi-step ceremony. Even after context compaction, just call `get_servers` again — the response is fully self-contained and tells you how to connect.

> Tools appear as `mcp__dsh-mcp-server__<name>`. Call them by short name; the prefix is automatic.

## Get a server and connect (the only flow you need most of the time)

```yaml
get_servers {}                       # all online servers
get_servers { gpu_model: "NVIDIA A100", min_gpu_memory_gb: 40 }   # filtered
```

Each server in the response has: `host`, `port`, `username`, `auth_method`, `key_path`,
`key_content_b64`, `password`, `connection_mode_label`, hardware specs, `online`,
`reachable_proxies`. The response also carries a `how_to_connect` string.

### Connecting

**The SSH key is returned as single-line base64 (`key_content_b64`) with no newlines**, so it
survives JSON transport and context compaction intact. Decode it to a real key file before use:

```bash
# 1. Restore the key from base64 (only if key_path does not already exist on this machine)
echo "<key_content_b64>" | base64 -d > /tmp/dsh_<server_id>
chmod 600 /tmp/dsh_<server_id>

# 2. SSH in
ssh -i /tmp/dsh_<server_id> <username>@<host> -p <port>
```

- If `key_path` points to a file that already exists locally, use it directly:
  `ssh -i <key_path> <username>@<host> -p <port>` — skip the decode step.
- If `auth_method` is `password`, use the `password` field directly.
- If `connection_mode_label` contains "代理"/proxy or the direct connection fails, route through
  the lowest-latency entry in `reachable_proxies`:
  ```bash
  ssh -o ProxyCommand="nc -X 5 -x <proxy.host>:<proxy.port> %h %p" \
      -i /tmp/dsh_<server_id> <username>@<host> -p <port>
  ```

That is the whole loop: `get_servers` → decode key → `ssh`.

## Other tools (occasional management, not part of the connect loop)

| Tool | When |
|------|------|
| `upsert_server` | Register or update a server, keyed by `host` (IP). Same host → update; new host → create. Ideal for pushing a freshly-configured server env to the MCP without looking up an ID. Pass `key_content` (plaintext PEM) + optional `key_path`, or `password`. |
| `update_server` | Change any field by `server_id`, save detected hardware, or set `enabled` (1 show / 0 hide). |
| `remove_server` | Delete a server (irreversible — confirm first). |
| `verify_server_connectivity` | Probe direct SSH + all proxies; caches reachability that `get_servers` then returns. |
| `list_proxies` / `add_proxy` / `remove_proxy` | Manage the SOCKS5/HTTP relay pool. |

## Multi-server orchestration

When you need to spread work across multiple servers or coordinate them:

1. **Distribute N tasks** — call `plan_task_allocation { tasks: [...] }` with each task's `id` and resource needs (`gpu_count`, `min_gpu_memory_gb`, `min_ram_gb`, `min_disk_gb`, `min_cpu_cores`). Returns a recommended `task→server` table + ranked candidates. If `stale_warnings` shows load data is old, call `refresh_load` first (it returns probe commands to run on each server; write results back with `upsert_server`).
2. **Disk too small on a machine** — call `plan_disk_share { needy_server_id, need_gb, mode }`. Returns a disk-rich reachable provider + sshfs (default) / nfs mount commands. Execute `sshfs.prep_key_cmd` + `sshfs.mount_cmd` on the needy machine.
3. **Slow / blocked network on a machine** — call `plan_network_relay { target_server_id, resource_url }`. Returns proxy-acceleration commands (`http_proxy` env, `proxychains`, git/wget/pip configs) if a reachable proxy exists, and/or jump-relay commands (download on a healthy server, `scp -3` to the target) if a healthy server exists.

**Operational knowledge:** after configuring something reusable on a server (e.g. a global proxy, CUDA env, a disk mount), write it back with `upsert_server { host, notes_entry: { topic, content } }` so other agents read it in `get_servers`' `notes_entries` and don't re-discover it.

**Refresh load:** when `get_servers` or `plan_task_allocation` returns stale load data, call `refresh_load {}`. It returns per-server nvidia-smi/free/df commands with base64 credentials; run those on each server concurrently, then `upsert_server` the results back (gpu_util_pct, gpu_mem_free_gb, ram_free_gb, disk_free_gb, running_tasks).

## Notes

- After `upsert_server`, the server is offline until you run `verify_server_connectivity`.
- Proxy reachability is cached; fresh results appear in `get_servers`' `reachable_proxies`.
- Server IDs are UUIDs — always take them from `get_servers`, never ask the user to type them.
- Do not print full decoded key contents back into the conversation; reference by path.
