# CN proxy client — reference facts & traps

> Credentials, known-box facts, and every trap already paid for. **Read this before deploying** — it's what makes this fast.

## tor1 exit node (159.203.15.86)

| Item | Value |
|------|-------|
| IP | `159.203.15.86` |
| Provider | DigitalOcean Toronto |
| OS | Ubuntu 24.04 |
| sing-box | 1.13.18, systemd-managed, active |
| BBR | enabled |
| SSH | `ssh root@159.203.15.86`, password `123456789Abc` |

### Available inbounds

| Protocol | Port | Notes |
|----------|:----:|-------|
| **hysteria2** | UDP 443, UDP 8443 | **Default choice** — 3x faster than TCP on lossy CN paths |
| vless-reality | TCP 443, TCP 8881 | TCP backup, **must enable multiplex** |
| vless-ws-tls | TCP 8888 | Self-signed cert, sing-box accepts but xray rejects — avoid |

### Credentials

```
UUID              5dd44557-6e9f-468f-a6f4-dded19c8c9ff
hysteria2 密码    A4Xu8CVlcAiKCh5gQOgY
reality 公钥      4idq6piHu_2oxDI0M9ljx-sbA4QUOH4lXPK8Nh81mh0
reality short_id  b10a4ec5
reality SNI       addons.mozilla.org
hy2 SNI           www.cloudflare.com (self-signed, client must insecure:true)
```

### Why hysteria2 is mandatory

CN → Toronto: RTT 274ms stable, **37.5% packet loss** (not jitter — actual loss).

| Protocol | Throughput |
|----------|------------|
| hysteria2 (QUIC + brutal) | **3.1–5.0 MB/s** |
| vless-reality + mux | 1.1–1.7 MB/s |
| vless-reality no mux | 75 KB/s – 1.2 MB/s (200s timeout once) |

**Mux alone takes reality from ~75 KB/s → 1.3+ MB/s.** If UDP blocked, TCP is acceptable but mux is not optional.

Real load verified: `pip download torch` (502 MB) → ~4 MB/s over hysteria2.

## Known box types & topologies

### deepln containers (`*.deepln.com`)

| Property | Value |
|----------|-------|
| Egress | **Has own TCP + UDP** — dials tor1 direct |
| Mode | `MODE=direct` |
| Lifetime | ~24h, then destroyed |
| systemd | No |
| TUN | Missing (`CAP_NET_ADMIN` denied) |
| DNS | `169.254.25.10`, search `*.svc.cluster.local` |
| Network | Calico CNI, `10.230.0.0/16` pod IPs, gateway `169.254.1.1` |
| Preinstalled | Some images have sing-box from `deb.sagernet.org` |

**Trap**: apt sources already point to CN mirrors — use `-o Acquire::http::Proxy=DIRECT` when installing packages.

**Handoff doc**: `C:\Users\hulk cheng\Desktop\公司\deepln-proxy-setup-prompt.md`

### virtaicloud (`*.virtaicloud.com`)

| Property | Value |
|----------|-------|
| Egress | **Has own** — dials tor1 direct |
| Mode | `MODE=direct` |
| PATH | miniconda bins only in login shell, `/usr/local/bin` missing from non-interactive |
| pypi | **Platform's `pypi.virtaicloud.com` returns 500 after 39s** — must use `pypi.org` |
| Tools | No `bc` command |

**Trap**: `all_proxy=socks5h://` breaks `huggingface_hub` (httpx rejects socks schemes) — must use `http://` scheme.

**Trap**: GitHub release assets can be blocked even when `github.com` resolves. Attempt the bounded direct transfer first; if it fails, call `get_servers` and `plan_network_relay` for the exact URL, then use the live MCP-selected proxy route. Use SFTP only as the final bootstrap fallback if both remote routes fail.

**Trap**: Setting `HF_HUB_ENABLE_HF_TRANSFER=1` without the package installed causes hard errors.

**Handoff doc**: `C:\Users\hulk cheng\Desktop\公司\virtaicloud-proxy-handoff.md`

**Memory node**: `C:\Users\hulk cheng\.claude\projects\C--Users-hulk-cheng-Desktop---\memory\virtaicloud-gpu-proxy-client.md`

### scnet zzai notebook

| Property | Value |
|----------|-------|
| Egress | **ZERO** — needs a reverse SSH tunnel created by a selected remote relay server (tor1 is the current example) |
| Mode | `MODE=tunnel TUNNEL_PORT=18809` |
| Tunnel | the remote relay maintains a reverse tunnel so zzai's `127.0.0.1:18809` reaches the relay's local sing-box HTTP inbound |
| systemd | No |
| TUN | Missing |

Client config: single `http` outbound pointing at `127.0.0.1:18809`, the **remote target's** loopback tunnel endpoint—not a Windows-local port.

**Trap**: ICMP loss heavily overstates real loss — box shows 75% ICMP drop but still hits 4 MB/s.

### hpccube wh-login02

| Property | Value |
|----------|-------|
| Egress | Has own |
| Mode | `MODE=direct` |
| User | **Non-root** |
| CA bundle | `/etc/ssl/certs/ca-certificates.crt` is **49 bytes** (stub) — breaks all Python HTTPS |

**Trap**: Must install `ca-certificates` package OR set `REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-bundle.crt` after finding valid bundle.

## MCP-selected download fallback

When GitHub, Hugging Face, package registries, or any other external source fails from a target, use this runtime-only sequence:

```text
target direct download (bounded timeout)
    └─ failure → get_servers (identify target) → plan_network_relay (exact URL)
                     └─ MCP-selected proxy or multi-proxy downloader runs on target
                         → checksum/size validation
```

- The target server—not Windows—downloads the data. Windows can control the operation over SSH only and must never be a data relay.
- Query MCP per failed URL; proxy availability and performance are live state. Never hard-code or persist proxy addresses, credentials, or proxy-export commands in the skill, target profiles, notes, shell history, or user-facing output.
- `scripts/download.sh` accepts temporary newline-separated `MCP_PROXY_URLS`, tries direct first, then retries through only those injected routes. Keep the value process-local.
- For files larger than 500 MB, prefer the multi-proxy, chunked, resumable downloader returned by `plan_network_relay`; validate an upstream checksum when available, otherwise validate the final size.
- Do not proxy loopback, RFC1918/link-local, Kubernetes, cluster endpoints, or domains that have a verified direct large-payload override. Deepln's USTC APT route remains explicitly direct based on the recorded payload benchmark.
- If all remote routes fail, SFTP a known-good local bootstrap artifact as a final fallback; do not use local Windows as an ongoing proxy relay.

## Mirror vs node speed inversion

**Every box gets a different CN ISP egress** → mirror-vs-node winner flips per box. Must measure, never assume.

| Box | Egress ISP | pypi winner | HF winner | apt winner |
|-----|-----------|-------------|-----------|-----------|
| deepln box 1 | (unknown) | **Aliyun 18.7 MB/s** | mirror | mirror |
| deepln box 2 | Henan Mobile `111.6.235.233` | **node 5.5 MB/s** | hf-mirror ≈ node | node |
| virtaicloud | (various) | **node** (platform mirror 500s) | node | aliyun direct |

**Correct config for box 2**: pip through node, `hf-mirror.com` + apt mirrors in `no_proxy` (direct).

### Measurement traps

- **Don't use `curl -sI`** (HEAD request) — `size_download=0` → looks like mirror is down
- **Don't use tiny files** — 1.4 KB tests handshake not bandwidth
- **Don't trust ICMP loss** — routers rate-limit ICMP; only throughput matters
- **Use cold downloads** — `pip download --no-cache-dir`, `rm -rf` caches between runs
- **Real packages only** — torch 2.0.0 wheel is 502 MB, bert-base-uncased model is 440 MB

## Environment variable schema

```bash
# Core proxy vars (MUST use http:// scheme for all_proxy)
http_proxy=http://127.0.0.1:10809
https_proxy=http://127.0.0.1:10809
all_proxy=http://127.0.0.1:10809          # NOT socks5h:// — breaks httpx
no_proxy=localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,.cluster.local,.svc

# Add to no_proxy based on bench results:
# - If aliyun mirror won: ,mirrors.aliyun.com
# - If tuna mirror won: ,mirrors.tuna.tsinghua.edu.cn
# - Platform-specific: ,pypi.virtaicloud.com,.virtaicloud.com
# - K8s: ,.cluster.local,.svc (always)
# - Link-local: ,169.254.0.0/16 (always on K8s pods)
```

## SSH connection patterns

### Direct connect (deepln, virtaicloud, hpccube)

```bash
ssh -i ~/.ssh/key user@host -p port
```

### Via SOCKS5 proxy

When tor1 or another hop is needed:

```bash
# Method 1: ProxyCommand
ssh -o ProxyCommand="nc -X 5 -x proxy-host:1080 %h %p" user@target

# Method 2: proxychains
proxychains4 ssh -i ~/.ssh/key user@host
```

### Remote relay-created reverse tunnel (zero egress)

Select the relay from `get_servers`; it must be an existing reachable remote server. `tor1` is the current known example, not an implicit local machine. Claim the target and claim the relay too when changing its tunnel service.

```text
zero-egress target 127.0.0.1:TUNNEL_PORT
    ← reverse SSH tunnel created and maintained on the relay →
relay local sing-box HTTP inbound
    → internet
```

The target's `127.0.0.1:TUNNEL_PORT` is bound and consumed on the remote target itself. Proxy traffic stays between remote servers and **must not transit the user's Windows machine**.

On the selected relay (current example: tor1):

```bash
# Bind only on the target loopback interface and fail immediately if forwarding cannot start.
ssh -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -R 127.0.0.1:18809:127.0.0.1:10809 user@zzai-box -N

# Persist and restart this relay-side connection with systemd or autossh.
```

Use a non-colliding `TUNNEL_PORT` for each target. Before `MODE=tunnel` deployment, verify that the target can reach its own `127.0.0.1:TUNNEL_PORT`; when the target's ephemeral SSH address or credentials change, update and restart the relay-side service. Record the relay identity, target endpoint, service/unit, and recovery command in MCP notes, then release the relevant claims when finished.

## sing-box client config patterns

### Direct mode (has egress)

```json
{
  "outbounds": [
    {"type": "selector", "tag": "proxy", "outbounds": ["hy2", "reality"], "default": "hy2"},
    {"type": "hysteria2", "tag": "hy2", "server": "159.203.15.86", "server_port": 443,
     "password": "A4Xu8CVlcAiKCh5gQOgY",
     "tls": {"enabled": true, "insecure": true, "server_name": "www.cloudflare.com"}},
    {"type": "vless", "tag": "reality", "server": "159.203.15.86", "server_port": 443,
     "uuid": "5dd44557-6e9f-468f-a6f4-dded19c8c9ff", "flow": "xtls-rprx-vision",
     "tls": {"enabled": true, "server_name": "addons.mozilla.org",
             "utls": {"enabled": true, "fingerprint": "chrome"},
             "reality": {"enabled": true, "public_key": "4idq6piHu_2oxDI0M9ljx-sbA4QUOH4lXPK8Nh81mh0", "short_id": "b10a4ec5"}},
     "multiplex": {"enabled": true, "protocol": "h2mux", "max_streams": 8}},
    {"type": "direct", "tag": "direct"}
  ],
  "route": {"rules": [
    {"ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16"], "outbound": "direct"},
    {"domain_suffix": [".local", ".svc", "cluster.local"], "outbound": "direct"}
  ], "final": "proxy"}
}
```

### Tunnel mode (zero egress)

`127.0.0.1:18809` below is the target machine's loopback endpoint supplied by the selected remote relay. The existing `via-tor1` tag reflects the current relay example; it does not make the endpoint Windows-local.

```json
{
  "outbounds": [
    {"type": "http", "tag": "via-tor1", "server": "127.0.0.1", "server_port": 18809},
    {"type": "direct", "tag": "direct"}
  ],
  "route": {"rules": [
    {"ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16"], "outbound": "direct"}
  ], "final": "via-tor1"}
}
```

## Keepalive pattern (no systemd)

```bash
#!/bin/bash
while true; do
  pgrep -f "sing-box run -c /etc/sb/client.json" >/dev/null || \
    setsid /usr/local/bin/sing-box run -c /etc/sb/client.json </dev/null >>/var/log/sing-box.log 2>&1 &
  sleep 15
done
```

**Critical**: Use `setsid` not `nohup ... &` — the latter dies with SSH channel close in `exec_command`.

## Acceptance criteria

| Test | Command | Expected |
|------|---------|----------|
| Exit IP | `curl -x http://127.0.0.1:10809 https://api.ipify.org` | `159.203.15.86` |
| Google 204 | `curl -x http://127.0.0.1:10809 -o /dev/null -w '%{http_code}' https://www.google.com/generate_204` | `204` |
| HF download | `python -c "from huggingface_hub import snapshot_download; snapshot_download('bert-base-uncased', allow_patterns=['config.json'])"` | Success |
| Ports listening | `ss -tlnp \| grep -E '10808\|10809'` | Both ports |
| Keepalive | Kill sing-box, wait 20s, recheck ports | Auto-restart |
| New shell | `bash -lc 'echo $https_proxy'` | `http://127.0.0.1:10809` |

## Handoff document pattern

When handing off to another session:

```markdown
# {platform} 容器配置代理 — 交接提示词

> 贴给新会话即可执行。

## 上游节点：tor1

| 项 | 值 |
|---|---|
| IP | 159.203.15.86 |
| hysteria2 | UDP 443，密码 A4Xu8CVlcAiKCh5gQOgY |
| reality | TCP 443，UUID 5dd44557-6e9f-468f-a6f4-dded19c8c9ff，公钥 4idq6piHu_2oxDI0M9ljx-sbA4QUOH4lXPK8Nh81mh0，short_id b10a4ec5 |

## 环境约束

[Platform-specific constraints]

## 部署步骤

1. Recon
2. Binary
3. Deploy
4. Measure
5. Verify

## 验收清单

[Acceptance tests]
```

Example: `deepln-proxy-setup-prompt.md`, `virtaicloud-proxy-handoff.md` in `C:\Users\hulk cheng\Desktop\公司\`.
