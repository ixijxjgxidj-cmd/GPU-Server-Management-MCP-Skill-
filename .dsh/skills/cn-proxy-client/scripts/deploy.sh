#!/bin/bash
# Deploy sing-box client. Writes /etc/sb/client.json, starts under keepalive loop.
# ENV: MODE=direct (has egress) | tunnel (zero-egress, needs tor1 reverse tunnel)
#      TUNNEL_PORT=18809 (if tunnel mode)
#      PORTS=10808,10809 (override defaults, shared login nodes)
#      PUBLIC_PORT=13112 (add 0.0.0.0 mixed inbound if user opened that port)
set -eu
MODE=${MODE:-direct}
TUNNEL_PORT=${TUNNEL_PORT:-18809}
TOR1=${TOR1:-159.203.15.86}
IFS=, read -r SOCKS HTTP <<< "${PORTS:-10808,10809}"
UUID=5dd44557-6e9f-468f-a6f4-dded19c8c9ff
HY2_PASS=A4Xu8CVlcAiKCh5gQOgY
REALITY_PK=4idq6piHu_2oxDI0M9ljx-sbA4QUOH4lXPK8Nh81mh0
REALITY_SID=b10a4ec5

mkdir -p /etc/sb /usr/local/bin /var/log
cat > /etc/sb/client.json <<EOF
{
 "log":{"level":"warn","timestamp":true},
 "inbounds":[
  {"type":"socks","tag":"socks-in","listen":"127.0.0.1","listen_port":$SOCKS},
  {"type":"http","tag":"http-in","listen":"127.0.0.1","listen_port":$HTTP}$(
  [ -n "${PUBLIC_PORT:-}" ] && cat <<INB
,
  {"type":"mixed","tag":"pub-mixed","listen":"0.0.0.0","listen_port":$PUBLIC_PORT}
INB
  )],
 "outbounds":[
EOF

case "$MODE" in
direct)
  cat >> /etc/sb/client.json <<'EOF'
  {"type":"selector","tag":"proxy","outbounds":["hy2","reality"],"default":"hy2"},
  {"type":"hysteria2","tag":"hy2","server":"159.203.15.86","server_port":443,
   "password":"A4Xu8CVlcAiKCh5gQOgY",
   "tls":{"enabled":true,"insecure":true,"server_name":"www.cloudflare.com"}},
  {"type":"vless","tag":"reality","server":"159.203.15.86","server_port":443,
   "uuid":"5dd44557-6e9f-468f-a6f4-dded19c8c9ff","flow":"xtls-rprx-vision",
   "tls":{"enabled":true,"server_name":"addons.mozilla.org",
          "utls":{"enabled":true,"fingerprint":"chrome"},
          "reality":{"enabled":true,"public_key":"4idq6piHu_2oxDI0M9ljx-sbA4QUOH4lXPK8Nh81mh0","short_id":"b10a4ec5"}},
   "multiplex":{"enabled":true,"protocol":"h2mux","max_streams":8}},
  {"type":"direct","tag":"direct"}],
 "route":{"rules":[
   {"ip_cidr":["127.0.0.0/8","10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","169.254.0.0/16"],"outbound":"direct"},
   {"domain_suffix":[".local",".svc","cluster.local"],"outbound":"direct"}],
  "final":"proxy"}
}
EOF
  ;;

tunnel)
  [ -z "${TUNNEL_PORT:-}" ] && { echo "MODE=tunnel needs TUNNEL_PORT" >&2; exit 1; }
  cat >> /etc/sb/client.json <<EOF
  {"type":"http","tag":"via-tor1","server":"127.0.0.1","server_port":$TUNNEL_PORT},
  {"type":"direct","tag":"direct"}],
 "route":{"rules":[
   {"ip_cidr":["127.0.0.0/8","10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","169.254.0.0/16"],"outbound":"direct"}],
  "final":"via-tor1"}
}
EOF
  ;;
*)
  echo "unknown MODE=$MODE" >&2; exit 1;;
esac

which sing-box >/dev/null 2>&1 || export PATH=/usr/local/bin:$PATH
sing-box check -c /etc/sb/client.json || { echo "CONFIG INVALID" >&2; exit 1; }

cat > /usr/local/bin/sb-keepalive.sh <<'EOF'
#!/bin/bash
LOG=/var/log/sb-keepalive.log
SB=$(command -v sing-box 2>/dev/null || echo /usr/local/bin/sing-box)
while true; do
  if ! pgrep -f "sing-box run -c /etc/sb/client.json" >/dev/null 2>&1; then
    echo "$(date -Is) starting sing-box" >> "$LOG"
    setsid "$SB" run -c /etc/sb/client.json </dev/null >>/var/log/sing-box.log 2>&1 &
  fi
  sleep 15
done
EOF
chmod +x /usr/local/bin/sb-keepalive.sh

pkill -f 'sing-box run|sb-keepalive' 2>/dev/null || true
sleep 2
setsid /usr/local/bin/sb-keepalive.sh </dev/null >>/var/log/sb-keepalive.log 2>&1 &
sleep 8

echo "=== deployed ==="
pgrep -af 'sb-keepalive|sing-box run' | head -3
echo
{ ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null; } | grep -E "$SOCKS|$HTTP${PUBLIC_PORT:+|}${PUBLIC_PORT:-9999}" | awk '{print $4" "$NF}' || echo "NOT LISTENING - FAILED"
