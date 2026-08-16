#!/bin/bash
# Acceptance tests: exit IP, google 204, real dataset download, persistence.
set -eu
export PATH=/usr/local/bin:/root/miniconda3/bin:/opt/conda/bin:$PATH
source /etc/profile.d/00-proxy.sh 2>/dev/null || true

SOCKS=${SOCKS:-socks5h://127.0.0.1:10808}
HTTP=${HTTP:-http://127.0.0.1:10809}
TOR1=${TOR1:-159.203.15.86}

echo "=== 1. exit IP (must be $TOR1) ==="
IP=$(timeout 15 curl -sS --max-time 12 -x "$HTTP" https://api.ipify.org 2>/dev/null || echo FAIL)
if [ "$IP" = "$TOR1" ]; then
  echo "✓ exit IP: $IP"
else
  echo "✗ FAIL: got $IP, expected $TOR1" >&2
  exit 1
fi

echo
echo "=== 2. google 204 ==="
CODE=$(timeout 12 curl -sS --max-time 10 -x "$HTTP" -o /dev/null -w '%{http_code}' https://www.google.com/generate_204 2>/dev/null || echo 0)
if [ "$CODE" = "204" ]; then
  echo "✓ google 204: $CODE"
else
  echo "✗ FAIL: got $CODE" >&2
  exit 1
fi

echo
echo "=== 3. real HuggingFace download (bert-base-uncased config.json ~600 bytes) ==="
if command -v python3 >/dev/null 2>&1; then
  timeout 60 python3 - <<'PY' || { echo "✗ FAIL: snapshot_download failed" >&2; exit 1; }
import sys
try:
    from huggingface_hub import snapshot_download
    snapshot_download("bert-base-uncased", allow_patterns=["config.json"], cache_dir="/tmp/.hf-test")
    print("✓ snapshot_download OK")
except Exception as e:
    print(f"✗ FAIL: {e}", file=sys.stderr)
    sys.exit(1)
PY
  rm -rf /tmp/.hf-test 2>/dev/null
else
  echo "⊘ python3 not found, skip HF test"
fi

echo
echo "=== 4. proxy persistence (kill sing-box, wait 20s, recheck) ==="
pkill -f 'sing-box run' 2>/dev/null || true
echo "killed sing-box, waiting 20s for keepalive..."
sleep 20
pgrep -f 'sing-box run' >/dev/null 2>&1 || { echo "✗ FAIL: sing-box not restarted" >&2; exit 1; }
IP2=$(timeout 12 curl -sS --max-time 10 -x "$HTTP" https://api.ipify.org 2>/dev/null || echo FAIL)
if [ "$IP2" = "$TOR1" ]; then
  echo "✓ keepalive works, exit IP still $TOR1"
else
  echo "✗ FAIL: after restart got $IP2" >&2
  exit 1
fi

echo
echo "=== 5. ports listening ==="
{ ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null; } | grep -E '10808|10809' || { echo "✗ FAIL: ports not listening" >&2; exit 1; }
echo "✓ ports OK"

echo
echo "=== ALL TESTS PASSED ==="
