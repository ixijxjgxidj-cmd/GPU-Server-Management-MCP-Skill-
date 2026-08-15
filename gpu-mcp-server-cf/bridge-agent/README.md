# DSH Jump-box Probe Agent

Cloudflare Workers can't open SSH sockets, so the Worker can't probe server load
itself. This agent runs on a **reachable jump-box** and does it on a timer.

## Model: pull, not push

The Worker cannot push to the jump-box either. So the jump-box **pulls**:

```
[systemd timer, every 5 min]
  -> dsh-agent.py
     -> GET  {WORKER}/api/bridge/tasks   (through a socks5 proxy, Bearer token)
     -> for each server: SSH probe   (direct first, then each socks5 proxy)
     -> POST {WORKER}/api/bridge/report (online + live load + hardware)
```

The jump-box in use (`cn-fj-qz-2.server.zakocloud.com`) **cannot reach
`workers.dev` directly** (verified: google/CF blocked, baidu OK) but **can** reach
it through either socks5 proxy in the pool. So every Worker HTTP call is made with
`curl --socks5-hostname user:pass@host:port`.

## Target-side SSH: two modes, tried in order

`/api/bridge/tasks` returns an `ssh_plan` per server. The agent tries each until
one connects:

1. **direct** — `ssh host` straight from the jump-box.
2. **socks5** — `ssh -o ProxyCommand=...` through each pool proxy. OpenSSH on this
   box has no `nc -X`, so `dsh-agent.py` ships a tiny pure-stdlib socks5 client
   (`socks_pc.py`, written to a temp dir at runtime) used as the ProxyCommand.

Whichever mode connects is reported as `connected_via` and cached as proxy
reachability, so `get_servers` later returns it under `reachable_proxies`.

## Files

| File | Where it goes |
|------|---------------|
| `dsh-agent.py` | `/opt/dsh-agent/dsh-agent.py` |
| `dsh-agent.service` | `/etc/systemd/system/dsh-agent.service` |
| `dsh-agent.timer` | `/etc/systemd/system/dsh-agent.timer` |
| `dsh-agent.env` (you create it) | `/etc/dsh-agent.env` (chmod 600 — holds the token) |

## /etc/dsh-agent.env

```
WORKER_URL=https://dsh-mcp-server.hulkcheng0806.workers.dev
BRIDGE_TOKEN=<the BRIDGE_TOKEN wrangler secret>
EGRESS_PROXY=20.205.122.49:21080:admin:<proxy-password>
JUMP_HOST=cn-fj-qz-2.server.zakocloud.com
SSH_TIMEOUT=20
```

`EGRESS_PROXY` = `host:port` or `host:port:user:pass`. `JUMP_HOST` excludes the
jump-box itself from the target list.

## Install

```bash
sudo mkdir -p /opt/dsh-agent
sudo cp dsh-agent.py /opt/dsh-agent/
sudo cp dsh-agent.service dsh-agent.timer /etc/systemd/system/
sudo tee /etc/dsh-agent.env >/dev/null <<'EOF'
WORKER_URL=https://dsh-mcp-server.hulkcheng0806.workers.dev
BRIDGE_TOKEN=...
EGRESS_PROXY=20.205.122.49:21080:admin:...
JUMP_HOST=cn-fj-qz-2.server.zakocloud.com
EOF
sudo chmod 600 /etc/dsh-agent.env
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-agent.timer
# run once now:
sudo systemctl start dsh-agent.service
journalctl -u dsh-agent.service -n 50 --no-pager
```

## Security notes

- `/etc/dsh-agent.env` holds the bridge token and proxy password — `chmod 600`,
  root-only. The agent never logs secrets.
- Decoded target SSH keys are written to a per-run temp dir (`chmod 600`) and
  removed with the process; they are never committed.
- `/api/bridge/*` fail closed if `BRIDGE_TOKEN` is unset on the Worker.
