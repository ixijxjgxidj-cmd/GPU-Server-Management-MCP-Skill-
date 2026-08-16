#!/bin/bash
# Download a resource directly first, then retry through MCP-selected proxy URLs.
# Callers must obtain MCP_PROXY_URLS from get_servers + plan_network_relay at runtime.
# Usage: download.sh URL OUTPUT [--sha256 SHA256]
set -euo pipefail

usage() {
  cat <<'EOF'
usage: download.sh URL OUTPUT [--sha256 SHA256]

Attempts a resumable direct download first. If it fails, retries through the
newline-separated proxy URLs supplied in MCP_PROXY_URLS. Proxy values are never
printed or persisted. For large files, use the multi-proxy downloader returned
by plan_network_relay instead of this single-stream helper.
EOF
}

[ "$#" -ge 2 ] || { usage >&2; exit 64; }
URL=$1
OUTPUT=$2
shift 2
EXPECTED_SHA256=
if [ "${1:-}" = "--sha256" ]; then
  [ -n "${2:-}" ] || { usage >&2; exit 64; }
  EXPECTED_SHA256=$2
  shift 2
fi
[ "$#" -eq 0 ] || { usage >&2; exit 64; }

case "$URL" in
  http://*|https://*) ;;
  *) echo "download URL must use http or https" >&2; exit 64 ;;
esac

CONNECT_TIMEOUT=${DOWNLOAD_CONNECT_TIMEOUT:-15}
MAX_TIME=${DOWNLOAD_MAX_TIME:-180}
PARTIAL="${OUTPUT}.part"
mkdir -p "$(dirname "$OUTPUT")"

check_output() {
  [ -s "$PARTIAL" ] || return 1
  if [ -n "$EXPECTED_SHA256" ]; then
    printf '%s  %s\n' "$EXPECTED_SHA256" "$PARTIAL" | sha256sum -c - >/dev/null 2>&1 || return 1
  fi
  mv -f "$PARTIAL" "$OUTPUT"
}

download_with_curl() {
  local proxy=${1:-}
  local -a args=(--fail --location --retry 1 --retry-delay 1 --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" --output "$PARTIAL")
  [ -f "$PARTIAL" ] && args+=(--continue-at -)
  if [ -n "$proxy" ]; then
    args+=(--proxy "$proxy")
  else
    args+=(--noproxy '*')
  fi
  curl "${args[@]}" "$URL" >/dev/null 2>&1
}

if command -v curl >/dev/null 2>&1; then
  if download_with_curl "" && check_output; then
    echo "download completed: direct"
    exit 0
  fi
else
  echo "curl is required for resumable proxy fallback" >&2
  exit 69
fi

# MCP_PROXY_URLS is supplied only for this process by the calling agent.
# Read one URL per line so a URL with encoded characters remains intact.
if [ -z "${MCP_PROXY_URLS:-}" ]; then
  echo "direct download failed; no MCP proxy route was supplied" >&2
  exit 1
fi

while IFS= read -r proxy; do
  [ -n "$proxy" ] || continue
  if download_with_curl "$proxy" && check_output; then
    echo "download completed: MCP proxy fallback"
    exit 0
  fi
done <<< "$MCP_PROXY_URLS"

rm -f "$PARTIAL"
echo "download failed through direct and MCP-selected proxy routes" >&2
exit 1
