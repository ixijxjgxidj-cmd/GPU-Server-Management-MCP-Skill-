#!/bin/bash
# Recon a CN box before deploying a proxy client. Read-only, no changes.
# Key output lines: EGRESS_IP (empty => zero-egress => tunnel mode), TOR1_UDP443,
# TUN, PIP/PATH_HAS_LOCALBIN (=> whether later calls need --login).
TOR1=${TOR1:-159.203.15.86}
export PATH=/root/miniconda3/bin:/opt/conda/bin:/usr/local/bin:$PATH
kv(){ printf '%s=%s\n' "$1" "$2"; }

echo "=== identity ==="
kv HOSTNAME "$(hostname)"
kv OS "$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME")"
kv KERNEL "$(uname -r)"
kv USER "$(id -un):$(id -u)"
kv CORES "$(nproc 2>/dev/null)"
kv RAM_GB "$(awk '/MemTotal/{printf "%.0f",$2/1048576}' /proc/meminfo 2>/dev/null)"
kv ROOT_DISK "$(df -h / 2>/dev/null | awk 'NR==2{print $2" avail "$4}')"
kv GPU "$(ls /dev/nvidia0 >/dev/null 2>&1 && echo nvidia || { ls /dev/kfd >/dev/null 2>&1 && echo amd-kfd || echo none; })"

echo
echo "=== capability limits (decide topology, don't fight these) ==="
kv TUN "$([ -e /dev/net/tun ] && echo present || echo missing)"
kv SYSTEMD "$(pidof systemd >/dev/null 2>&1 && echo yes || echo no)"
kv IP_CMD "$(command -v ip >/dev/null 2>&1 && echo present || echo missing)"
( ip route add 203.0.113.0/32 dev lo >/dev/null 2>&1 && \
  { kv NET_ADMIN yes; ip route del 203.0.113.0/32 dev lo >/dev/null 2>&1; } ) || kv NET_ADMIN no

echo
echo "=== toolchain (MISSING here => use sshrun --login or absolute paths) ==="
kv PATH_NONINTERACTIVE "$PATH"
for t in sing-box python3 pip curl wget git bc awk ss netstat setsid proxychains4; do
  kv "$(echo $t | tr 'a-z-' 'A-Z_')" "$(command -v $t 2>/dev/null || echo missing)"
done
kv PATH_HAS_LOCALBIN "$(case ":$(bash -lc 'echo $PATH' 2>/dev/null):" in *:/usr/local/bin:*) echo yes;; *) echo no;; esac)"
kv LOGIN_PIP "$(bash -lc 'command -v pip' 2>/dev/null || echo missing)"

echo
echo "=== egress: does this box reach the internet at all? ==="
EG=$(timeout 12 curl -s --max-time 10 https://ifconfig.me 2>/dev/null \
     || timeout 12 curl -s --max-time 10 https://ipinfo.io/ip 2>/dev/null)
kv EGRESS_IP "$EG"
[ -z "$EG" ] && echo "  >>> ZERO EGRESS: use MODE=tunnel; tor1 must dial IN (see reference.md)"

echo
echo "=== reachability of tor1 inbounds ==="
for pt in 443 8881 8888; do
  timeout 8 bash -c "exec 3<>/dev/tcp/$TOR1/$pt" 2>/dev/null \
    && kv "TOR1_TCP$pt" ok || kv "TOR1_TCP$pt" blocked
done
if command -v nc >/dev/null 2>&1; then
  timeout 8 nc -zu "$TOR1" 443 >/dev/null 2>&1 && kv TOR1_UDP443 ok || kv TOR1_UDP443 "unknown(nc-u unreliable)"
else
  kv TOR1_UDP443 "unknown(no nc)"
fi
# real UDP proof: DNS query out to a public resolver
timeout 8 python3 - <<'PY' 2>/dev/null || kv UDP_EGRESS no
import socket
s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM); s.settimeout(6)
s.sendto(bytes.fromhex("abcd01000001000000000000")+b"\x06google\x03com\x00\x00\x01\x00\x01",("8.8.8.8",53))
s.recvfrom(512); print("UDP_EGRESS=yes")
PY

echo
echo "=== existing proxy remnants ==="
pgrep -af 'sing-box|sb-keepalive' 2>/dev/null | head -5 || echo "none running"
{ ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null; } | grep -E '10808|10809|13112|18809' || echo "no proxy ports listening"

echo
echo "=== preconfigured package sources (verify, some are broken) ==="
kv PIP_INDEX "$(bash -lc 'pip config list 2>/dev/null' | grep index-url || echo unset)"
grep -rhoP 'https?://[^ ]+' /etc/apt/sources.list /etc/apt/sources.list.d/ 2>/dev/null | sort -u | head -4
kv DNS "$(awk '/^nameserver/{printf "%s ",$2}' /etc/resolv.conf 2>/dev/null)"
