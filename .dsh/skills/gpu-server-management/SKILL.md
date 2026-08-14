---
name: gpu-server-management
description: Use when you need a GPU server to train, infer, or run any compute task — to connect to one, spread tasks across several, borrow disk from another machine, or route around a slow or blocked network. Also use when registering a server you just configured, or when an SSH connection to a known server fails.
---

# GPU Server Management

A shared registry that lets you **drive many remote machines as one pool**. The database is
**collective memory**: what one agent configures and records, every later agent reads back — so
setup work is never repeated and machines cooperate instead of being used one at a time.

**What this unlocks — the reason to reach for these tools:**

| Goal | Tool | In one line |
|------|------|-------------|
| **Spread work** across machines | `plan_task_allocation` | Queue N training/inference jobs onto whatever GPU servers are free, balanced by real load. |
| **Borrow disk** | `plan_disk_share` | Mount a disk-rich machine onto one that ran out of space (turn a peer into a cloud disk). |
| **Route around a bad network** | `plan_network_relay` | Accelerate a slow/blocked download through a proxy, or relay the file via a healthy server. |
| **Teach the next agent** | `upsert_server { notes_entry }` | Write back what you set up (global proxy, CUDA env, mounts) so the next call returns it. |

So a typical multi-server session is: **read the pool → act → write back what you changed.**
The last step is what makes the pool smarter over time — never skip it.

12 tools in 4 layers. **Layer 1 handles most requests.** Read further only when Layer 1 is not enough.

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

**Before connecting, read that server's `notes_entries`** — this is knowledge earlier agents wrote
back about *this exact machine*: a global proxy already running, the CUDA env, existing mounts,
credentials quirks. It is the whole point of the shared registry. Acting without reading it means
re-doing work that is already done, or fighting a config another agent deliberately set. When you
finish, write your own back (Layer 3, "Record what you configure").

### SSH fallback ladder

Try in order; stop at the first that connects.

| # | Condition | Action |
|---|-----------|--------|
| 1 | `key_path` file exists locally | `ssh -i <key_path> ...` — skip the decode |
| 2 | `auth_method: key` | decode `key_content_b64`, `ssh -i /tmp/dsh_<id> ...` |
| 3 | `auth_method: password` | use the `password` field directly |
| 3.5 | `connection_type: cloudflare_tunnel` | host is a Cloudflare tunnel hostname; `ssh -o ProxyCommand="cloudflared access ssh --hostname %h" -i <key> <username>@<host>` (needs `cloudflared` installed + `cloudflared login` done on your machine) |
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

### Worked scenarios

**A · 8 tasks, several GPU machines — spread them.**
```
refresh_load {}            → run the probes over SSH, upsert_server the results   # optional but recommended
plan_task_allocation { tasks: [ {id:"t1",gpu_count:1,min_gpu_memory_gb:24}, ... {id:"t8", ...} ] }
  → recommended_allocation maps every task to a server; run each over SSH.
  → any task in `unassignable`? read its reason; free a machine, relax the spec, or queue it.
```
Balance is real only on fresh load — refresh first, or trust `stale_warnings` at your own risk.

**B · A machine is out of disk — borrow another's.**
```
plan_disk_share { needy_server_id, need_gb: 200, mode: "sshfs" }
  → returns a disk-rich reachable provider + prep_key_cmd + mount_cmd
  → run BOTH on the needy machine; it now has the peer's space mounted like a cloud disk.
  → umount_cmd when done.
```

**C · A download is slow or blocked — accelerate or relay.**
```
plan_network_relay { target_server_id, resource_url: "https://…/model.tar" }
  → proxy_acceleration.commands present? run them on the target (fastest, no 2nd machine).
  → only jump_relay.steps? download on the healthy server, then scp -3 to the target.
```

Each plan returns commands only — you SSH in and run them, then record any lasting setup with
`upsert_server { notes_entry }` so the next agent inherits it.

### GPU sharing mode

Each server has a `gpu_sharing_mode` that governs how `plan_task_allocation` counts GPU capacity:

- **`shared`** (default) — multiple tasks co-locate on the same card; capacity is gated by **free
  VRAM**, not card count. Right for inference and light co-located jobs. A 1-card machine with
  8 GB free can take several 2 GB tasks.
- **`exclusive`** — a task claims **whole cards**; schedulable cards = `gpu_count - running_tasks`.
  Right for training that must not share a GPU.

Set it per server in the web UI (edit server → GPU分配模式) or via
`upsert_server { host, gpu_sharing_mode: "exclusive" }`. If GPU tasks come back `unassignable` on a
busy shared card, the limit is VRAM — check `gpu_mem_free_gb`, not the card count.

### Load freshness loop
`plan_task_allocation` falls back to static specs when live load is missing and flags it in
`stale_warnings`; allocations built on stale data can overcommit a busy machine.

**Load is normally kept fresh for you.** A probe agent on a jump-box
(`cn-fj-qz-2.server.zakocloud.com`) runs every ~5 min: it pulls the server list from the Worker,
SSHes into each (direct, else via a socks5 proxy), and writes back live load + online status. So
`get_servers` usually already carries recent `load_age_sec`. Cloudflare Workers cannot SSH, so this
jump-box is *how* load exists at all — see "Layer 4 · Jump-box probe agent".

You only refresh by hand when the agent is down or you need a reading right now:

```
refresh_load {}                          # get probe commands per server
  → run them over SSH concurrently       # nvidia-smi / free / df
  → upsert_server { host, gpu_util_pct, gpu_mem_free_gb, ram_free_gb, disk_free_gb, running_tasks }
  → plan_task_allocation { tasks }        # now decides on live data
```

`get_servers` reports `load_age_sec` per server (`null` = never probed).

### Training-environment versions and live CPU hogs

The probe agent also captures each server's software stack and its busiest processes, so you can
pick a machine that already has the right environment and see what's competing for it:

- `python_version` — e.g. `3.12.3`
- `torch_version` — e.g. `2.3.1+cu121` (empty if PyTorch isn't installed)
- `cuda_version` — driver CUDA from `nvidia-smi`, else `nvcc` release, e.g. `12.4`
- `top_cpu_tasks` — live top-3 by CPU: `[{cpu, mem, cmd}, …]` (`cpu`/`mem` are percentages)

Use these to route: don't send a Torch job to a box with no `torch_version`; treat a server whose
`top_cpu_tasks` shows a `python` process at ~100% as already busy even if `running_tasks` looks low.

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

**`host` (IP/domain) is the sole identity of a server.** `upsert_server` looks up by `host`: same
host → updates that record, new host → creates one. This is deliberate — after you configure a
machine's environment you just `upsert_server { host, ... }` and it lands on the right record
whether or not it already exists, with no ID lookup and no risk of a duplicate.

| Tool | When |
|------|------|
| `upsert_server { host, ... }` | Register or update in one call, keyed by `host`. New servers also require `name`, `username`, `auth_method`. Pass `key_content` as **plaintext PEM** (the server base64-encodes it on read). |
| `update_server { server_id, updates }` | Change fields by ID, including `enabled` (`1` visible / `0` hidden). |
| `remove_server { server_id }` | Irreversible — confirm with the user first. |

### Record what you configure — the write-back habit

The registry only stays useful if agents feed it. **Any time you set up something on a machine that
a later agent would otherwise have to rediscover, write it back with a `notes_entry`.** Example: you
configure a global proxy so `pip`/`git` route through it — record that, and the next agent's
`get_servers` call returns it under `notes_entries`, so it won't re-configure or fight your setup.

```yaml
upsert_server {
  host: "<ip>",
  agent: "<your-agent-name>",
  notes_entry: { topic: "global_proxy", content: "http_proxy=socks5://127.0.0.1:1080; pip/git already routed; do not re-configure" }
}
```

Same `topic` overwrites; different topics accumulate. Other agents read these as `notes_entries`.
Use stable topics so updates land on the same entry: `global_proxy`, `cuda_env`, `disk_mount`,
`dataset_path`. Write back **live load** the same way (`gpu_util_pct`, `gpu_mem_free_gb`,
`running_tasks`, …) so `plan_task_allocation` balances on truth, not stale specs.

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

### Jump-box probe agent (how live load exists)

Cloudflare Workers can't open SSH sockets, so the Worker itself can never read a server's load. A
small agent on a **jump-box** does it and pushes results back, on a timer (pull model):

```
[systemd timer, ~5 min]  →  GET /api/bridge/tasks  →  SSH-probe each server  →  POST /api/bridge/report
```

- The agent tries **direct SSH first, then each socks5 proxy** (via a ProxyCommand) — the same
  reachability model as everything else. Whichever mode connects is cached as `reachable_proxies`.
- Both `/api/bridge/*` endpoints require the `BRIDGE_TOKEN` secret; the jump-box reaches the Worker
  through a socks5 proxy because it can't hit `workers.dev` directly.
- Source + install steps live in the repo at `dsh-mcp-server-cf/bridge-agent/` (`dsh-agent.py`,
  systemd `.service`/`.timer`, README). As an agent you normally **just consume the fresh load**
  via `get_servers`; touch the jump-box only to add a probe target or debug a stale reading.

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
