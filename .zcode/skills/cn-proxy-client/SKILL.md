---
name: cn-proxy-client
description: Configure a sing-box proxy client on a rented CN GPU box / container (deepln, virtaicloud, scnet zzai, hpccube) so pip / apt / curl / HuggingFace work. Use when the user gives an SSH target and asks to 配置代理 / 配代理 / set up a proxy, or when downloads fail from inside such a box. Handles both boxes that have their own egress and boxes with zero egress.
---

# CN GPU box → proxy client

Turns a rented CN box into a working proxy client pointed at the `tor1` exit node. Credentials, known-box facts and every trap already paid for are in `reference.md` — **read it before deploying**, it's what makes this fast.

## Hard rules

1. **Never route the data path through the user's local Windows machine.** Standing constraint. SSH *from* local for control is fine; a `ssh -R` started *on* local is not. If a tunnel is needed, it must be created and maintained on a selected existing remote relay server (tor1 is the current example).
2. **严禁 SSH 本机隧道端口**
3. **Never echo private keys or their contents.** Refer to `key_content: [已配置]`.
4. **Don't try TUN / transparent proxy / true global mode.** Every box so far lacks `/dev/net/tun` or `CAP_NET_ADMIN`. Userspace only: SOCKS + HTTP inbound + env vars + proxychains.
5. **Measure sources, never assume.** Mirror-vs-node speed flips per box because each gets a different CN ISP egress. Skipping `bench.sh` has produced wrong config twice.
6. **On a real external-download failure, use live MCP routing.** Attempt the bounded direct transfer first; then call `get_servers` for the target and `plan_network_relay` for the exact URL before retrying through a current proxy. Never copy proxy credentials into this skill, persistent target configuration, logs, or user-facing output.

## Workflow

All scripts run through `scripts/sshrun.py` (paramiko — Windows has no sshpass/plink):

```bash
python sshrun.py --host H --port P --user U --key ~/.ssh/k --script recon.sh
```

`--password X` instead of `--key` for password boxes. `--login` wraps in `bash -lc` (needed when the tool lives in miniconda). `--put local remote` to SFTP a file. Full usage: `python sshrun.py -h`.

### 1. Recon

```bash
python scripts/sshrun.py <auth> --script scripts/recon.sh
```

Read four things off the output, they decide everything else:

| Output line | Meaning |
|---|---|
| `EGRESS_IP=` | empty → **zero-egress box**. Before deployment, use `get_servers` to select a reachable remote relay; the relay—not Windows—must create the reverse tunnel described below. |
| `TOR1_UDP443=ok` | UDP works → hysteria2 as default outbound (3x faster) |
| `TUN=missing` | expected; confirms userspace-only, don't fight it |
| `PIP=` / `PATH_HAS_LOCALBIN=` | tells you whether later commands need `--login` |

### 2. Get binaries and external resources in place

`recon.sh` prints `SINGBOX=missing` if absent. Try a **bounded, resumable direct** transfer first. When GitHub releases or any other external resource genuinely fails, do not guess or reuse a stale proxy endpoint:

1. Call `get_servers` and identify the registered target by its server ID.
2. Call `plan_network_relay { target_server_id, resource_url }` for the exact failed URL.
3. Supply only the returned current proxy route to `scripts/download.sh` through its process-local `MCP_PROXY_URLS` value, then retry. Do not persist it in `/etc/profile`, git/pip config, shell history, notes, or the final report.
4. For payloads larger than 500 MB, use the multi-proxy chunked/resumable downloader returned by `plan_network_relay`; validate the expected checksum or final size.

```bash
# The agent obtains MCP_PROXY_URLS from MCP at retry time; never hard-code it.
MCP_PROXY_URLS="$MCP_PROXY_URLS" bash scripts/download.sh <url> <output> --sha256 <expected-sha256>
```

Keep known benchmark winners on their established direct route—e.g. Deepln's large-payload USTC APT bypass—and never proxy loopback, private, K8s, or cluster endpoints. If neither direct nor the MCP-selected route works, SFTP is the final bootstrap fallback for a known-good local artifact:

```bash
python scripts/sshrun.py <auth> --put ./sing-box /usr/local/bin/sing-box --chmod 755
```

### 3. Deploy

```bash
# box has its own egress (deepln, virtaicloud) — dials tor1 directly
python scripts/sshrun.py <auth> --script scripts/deploy.sh --env MODE=direct

# zero-egress box (scnet zzai): create and verify the relay-owned tunnel first.
# 1. get_servers → select a reachable existing relay (tor1 is the known example).
# 2. Claim the target and, for exclusive relay changes, the relay too.
# 3. On the remote relay server, create a reverse SSH tunnel to the target;
#    the target's 127.0.0.1:18809 is target-local, never Windows-local.
# 4. Verify that endpoint, persist the tunnel on the relay (systemd/autossh),
#    then deploy the target client.
python scripts/sshrun.py <target-auth> --script scripts/deploy.sh --env MODE=tunnel --env TUNNEL_PORT=18809
```

Optional `--env PORTS=18808,18809` on **shared** login nodes so you don't collide with other users, `--env PUBLIC_PORT=13112` to add an outward-facing mixed inbound (only if the user opened that port on the panel).

Writes `/etc/sb/client.json`, starts it with `setsid` under a 15s keepalive loop (no systemd on any of these boxes), verifies it listens. For `MODE=tunnel`, record the selected relay, target-loopback endpoint, relay service/unit, and recovery steps in MCP notes; release target and relay claims when the work is complete.

### 4. Measure, then wire up the environment

```bash
python scripts/sshrun.py <auth> --script scripts/bench.sh --timeout 500
```

Prints pip / HF / apt winners for **this** box. Feed them in:

```bash
python scripts/sshrun.py <auth> --script scripts/env.sh \
  --env PIP_INDEX=https://pypi.org/simple \
  --env HF_ENDPOINT=https://huggingface.co \
  --env NO_PROXY_EXTRA=.virtaicloud.com,mirrors.aliyun.com
```

`NO_PROXY_EXTRA` must include any mirror that won direct, plus the box's own cluster domains. Writes `/etc/profile.d/00-proxy.sh`, `/etc/environment`, `/root/.bashrc`, `/etc/pip.conf`, apt, git, wget, curl, and a `proxy-mode {on|off|status}` helper.

### 5. Verify

```bash
python scripts/sshrun.py <auth> --script scripts/verify.sh --timeout 300
```

Acceptance: exit IP is the tor1 IP (159.203.15.86), google 204, a real `snapshot_download` completes, and the ports survive an SSH disconnect. Anything else is not done.

### 6. MCP Collective Memory Registration (Mandatory)

Immediately upon completing deployment & verification on target server `<server_id>`:

1. **Update Server Proxy Status & Tags**:
   Call `update_server` so MCP tools (`get_servers`) and Google Drive routing immediately recognize the server:
   ```json
   {
     "server_id": "<target_server_id>",
     "updates": {
       "v2ray_available": 1,
       "tags": ["gpu", "sing-box", "global-proxy"]
     }
   }
   ```
2. **Persist Setup Details & Verified Endpoints**:
   Call `upsert_server` to write a structured `notes_entry`:
   ```json
   {
     "id": "<target_server_id>",
     "name": "<server_name>",
     "host": "<host>",
     "port": <port>,
     "username": "<user>",
     "auth_method": "<auth>",
     "notes_entry": {
       "topic": "global_proxy_usage_YYYYMMDD",
       "content": "【YYYY-MM-DD 全局代理配置与使用】已部署 sing-box 1.13.18。本地入口: HTTP=http://127.0.0.1:10809, SOCKS5=socks5://127.0.0.1:10808。新 SSH 会话自动生效，当前会话执行 source /etc/profile.d/00-proxy.sh。使用 proxy-mode {on|off|status} 切换。出口 IP=159.203.15.86。Google Drive 与 6 步下载策略已自动解锁！",
       "is_shared": false
     }
   }
   ```
3. **Record Any Pitfalls / Traps**:
   If any platform-specific quirk was encountered (e.g. systemd absent, legacy DNS fatal error, ETXTBSY on scp, or pypi mirror 500 error), immediately call `record_pitfall` to persist into the collective troubleshooting RAG memory!
4. **Release Lease**:
   Call `release_server` with `task_done: true`.

## Reporting back

Quote measured numbers, not expected ones. Say plainly which source won and that it may differ from the last box. Then offer a handoff doc — pattern in `reference.md §handoff`; the user usually wants one to paste into other sessions.

