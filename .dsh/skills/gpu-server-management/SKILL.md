---
name: gpu-server-management
description: Use when you need a GPU server to train, infer, or run any compute task — to connect to one, spread tasks across several, borrow disk from another machine, or route around a slow or blocked network. Also use when registering a server you just configured, or when an SSH connection to a known server fails.
---

# GPU Server Management

12 MCP tools in 4 layers. **Layer 1 handles most requests.** Read further only when Layer 1 is not enough.

> Tools appear as `mcp__dsh-mcp-server__<name>`. Call by short name; the prefix is automatic.

---

## Layer 1 — Connect (the default flow)

```yaml
get_servers {}                                                   # all online servers
get_servers { gpu_model: "NVIDIA A100", min_gpu_memory_gb: 40 }  # filtered
get_servers { include_offline: true }                            # also unreachable ones
```

One call returns everything needed to SSH in: `host`, `port`, `username`, `auth_method`,
`key_path`, `key_content_b64`, `password`, `connection_mode_label`, hardware, live load,
`notes_entries`, `reachable_proxies`, plus a `how_to_connect` string.

**This response is self-contained.** After context compaction, call `get_servers` again rather than
trying to recall connection details.

### Decode the key, then connect

The SSH private key comes back as **single-line base64** (`key_content_b64`, no newlines) so it
survives JSON transport and compaction intact. It is not usable until decoded:

```bash
echo "<key_content_b64>" | base64 -d > /tmp/dsh_<server_id>
chmod 600 /tmp/dsh_<server_id>
ssh -i /tmp/dsh_<server_id> <username>@<host> -p <port>
```

**Before connecting, read that server's `notes_entries`** — it holds operational knowledge other
agents recorded (global proxy in use, CUDA env, existing mounts). Skipping it means rediscovering
work already done.

### SSH fallback ladder

Try in order; stop at the first that connects.

| # | Condition | Action |
|---|-----------|--------|
| 1 | `key_path` file exists locally | `ssh -i <key_path> ...` — skip the decode |
| 2 | `auth_method: key` | decode `key_content_b64`, `ssh -i /tmp/dsh_<id> ...` |
| 3 | `auth_method: password` | use the `password` field directly |
| 4 | `connection_mode_label` contains 代理, or direct failed | lowest-latency entry in `reachable_proxies`:<br>`ssh -o ProxyCommand="nc -X 5 -x <proxy.host>:<proxy.port> %h %p" -i <key> <username>@<host> -p <port>` |
| 5 | all of the above failed | `verify_server_connectivity { server_id }` → report the diagnosis |

---

## Layer 2 — Orchestrate multiple servers

| Need | Tool | Returns |
|------|------|---------|
| Spread N tasks over machines | `plan_task_allocation { tasks: [{ id, gpu_count, min_gpu_memory_gb, min_ram_gb, min_disk_gb, min_cpu_cores }] }` | `recommended_allocation` table, `candidates_per_task` (ranked fallbacks), `unassignable` with reasons, `stale_warnings` |
| A machine is out of disk | `plan_disk_share { needy_server_id, need_gb, mode: "sshfs"\|"nfs"\|"both" }` | disk-rich reachable provider + mount commands |
| A machine's network is slow or blocked | `plan_network_relay { target_server_id, resource_url }` | proxy-acceleration commands and/or jump-relay steps |
| Load data is stale | `refresh_load { server_ids? }` | per-server probe commands + credentials |

**These tools plan; they never execute.** They return commands. You run them over SSH.

### Load freshness loop

`plan_task_allocation` falls back to static specs when live load is missing and flags it in
`stale_warnings`; allocations built on stale data can overcommit a busy machine. To refresh:

```
refresh_load {}                          # get probe commands per server
  → run them over SSH concurrently       # nvidia-smi / free / df
  → upsert_server { host, gpu_util_pct, gpu_mem_free_gb, ram_free_gb, disk_free_gb, running_tasks }
  → plan_task_allocation { tasks }        # now decides on live data
```

`get_servers` reports `load_age_sec` per server (`null` = never probed).

### Disk share

`plan_disk_share` returns `sshfs.prep_key_cmd` + `sshfs.mount_cmd` — run both **on the needy
machine**. `sshfs` is right for a temporary borrow; `nfs` (needs `provider_export_cmd` on the
provider first) for a long-lived share. Unmount with `sshfs.umount_cmd` when done.

### Network relay

`plan_network_relay` returns `proxy_acceleration.commands` (`env`, `proxychains`, `git`, `wget`,
`pip`) when the target can reach a proxy, and/or `jump_relay.steps` (download on a healthy
server, then `scp -3` to the target) when it cannot. Both may come back — prefer proxy
acceleration, since it needs no second machine.

---

## Layer 3 — Register and update

| Tool | When |
|------|------|
| `upsert_server { host, ... }` | Register or update in one call, keyed by `host` (IP/domain). Same host → update, new host → create. New servers also require `name`, `username`, `auth_method`. Pass `key_content` as **plaintext PEM** (the server base64-encodes it on read). |
| `update_server { server_id, updates }` | Change fields by ID, including `enabled` (`1` visible / `0` hidden). |
| `remove_server { server_id }` | Irreversible — confirm with the user first. |

### Record what you configure

After setting up anything reusable on a server, write it back:

```yaml
upsert_server {
  host: "<ip>",
  agent: "<your-agent-name>",
  notes_entry: { topic: "global_proxy", content: "http_proxy=socks5://127.0.0.1:1080; pip/git already routed; do not re-configure" }
}
```

Same `topic` overwrites; different topics accumulate. Other agents read these as `notes_entries`.
Use stable topics: `global_proxy`, `cuda_env`, `disk_mount`, `dataset_path`.

### Fill in hardware after registering

A server registered without specs shows N/A and is invisible to `plan_task_allocation` filters.
SSH in, run these, then write the results back with `upsert_server`:

```bash
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits   # gpu_model, per-card MB
nvidia-smi --query-gpu=name --format=csv,noheader | wc -l                # gpu_count
nproc                                                                    # cpu_cores
awk '/MemTotal/{printf "%.0f", $2/1024/1024}' /proc/meminfo               # ram_gb
df -BG / | awk 'NR==2{gsub(/G/,"",$2); print $2}'                        # disk_gb
```

---

## Layer 4 — Diagnose and proxies

| Tool | When |
|------|------|
| `verify_server_connectivity { server_id }` | Probe direct SSH + every proxy. Caches reachability that `get_servers` then returns as `reachable_proxies`. |
| `list_proxies` / `add_proxy { name, host, ... }` / `remove_proxy { proxy_id }` | Manage the SOCKS5/HTTP relay pool. |

---

## Resource ceilings

Stay under these when sizing a task, so a machine stays usable by others:

| Resource | Ceiling |
|----------|---------|
| VRAM | ≤ 90% of free per-card memory |
| RAM | ≤ 80% of `ram_gb` |
| Disk | ≤ 85% of `disk_gb` — over that, use `plan_disk_share` instead |
| GPUs | multi-card jobs need `gpu_count - running_tasks` free cards |

Distributed training additionally requires **identical `gpu_model` across all nodes**. If one node
of a multi-node job fails to connect, stop and report — do not silently run on fewer nodes.

---

## Security

- Never print a decoded private key back into the conversation. Reference it by path
  (`/tmp/dsh_<id>`); say `key: [configured]` when describing a server.
- Confirm with the user before `remove_server`.
- Do not overwrite `notes_entry` topics or config fields another agent set unless the user asks.

---

## Gotchas

**Layer 2 has two data prerequisites.** Both fail quietly with an empty-looking result rather than
an error, so check these first when a plan comes back empty:

| Symptom | Cause | Fix |
|---------|-------|-----|
| `unassignable: "no server with N free GPU cards"` on every task | `gpu_count` is null on those servers — packing cannot assume a card count | fill in hardware (Layer 3) so `gpu_count` is set |
| `plan_disk_share` → `"no reachable server with enough free disk"`, or `plan_network_relay` → only the degradation message | the two machines are not *known* to reach each other: neither is marked direct, and no proxy reachability is cached | run `verify_server_connectivity` on both, or set the direct flags via `upsert_server` |

A server counts as reachable for disk-share and relay only if it is marked direct
(`direct_when_no_proxy`, or `v2ray_available` + `direct_when_proxy_available`) **or** shares a
cached reachable proxy. A server with all three flags at 0 and no cached proxy is treated as
unreachable even while `online: true` — online means *the MCP can reach it*, not that peers can.

Other traps:

- `get_servers` returns **online servers only** by default. A server you just registered will not
  appear until you run `verify_server_connectivity` — pass `include_offline: true` to see it.
- `refresh_load` and `plan_task_allocation` also consider online servers only. Empty
  `targets: []` or `"no servers"` usually means nothing has been verified yet, not that capacity
  is exhausted.
- Server IDs are UUIDs — always take them from `get_servers`. `upsert_server` is the one tool
  keyed by `host` instead, so it works without a lookup.
- `notes` (free text) and `notes_entries` (per-topic, structured) are different fields. Write new
  operational knowledge to `notes_entry`; `notes` is legacy and unstructured.
- `disk_gb`/`disk_free_gb` being null makes a machine invisible as a disk provider even if it has
  space — probe it with `refresh_load` first.
