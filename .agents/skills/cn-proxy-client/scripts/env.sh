#!/bin/bash
# Wire up proxy env vars + per-tool configs based on bench.sh results.
# ENV: PIP_INDEX=https://pypi.org/simple (or mirror URL if direct won)
#      HF_ENDPOINT=https://huggingface.co (or hf-mirror.com)
#      NO_PROXY_EXTRA=.virtaicloud.com,mirrors.aliyun.com (domains to bypass)
set -eu
SOCKS_PORT=${SOCKS_PORT:-10808}
HTTP_PORT=${HTTP_PORT:-10809}
PIP_INDEX=${PIP_INDEX:-https://pypi.org/simple}
HF_ENDPOINT=${HF_ENDPOINT:-https://huggingface.co}
NO_PROXY_EXTRA=${NO_PROXY_EXTRA:-}

BASE_NO_PROXY="localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,.cluster.local,.svc"
NO_PROXY="$BASE_NO_PROXY${NO_PROXY_EXTRA:+,$NO_PROXY_EXTRA}"

cat > /etc/profile.d/00-proxy.sh <<EOF
export http_proxy=http://127.0.0.1:$HTTP_PORT
export https_proxy=http://127.0.0.1:$HTTP_PORT
export all_proxy=http://127.0.0.1:$HTTP_PORT
export no_proxy="$NO_PROXY"
export HTTP_PROXY=\$http_proxy
export HTTPS_PROXY=\$https_proxy
export ALL_PROXY=\$all_proxy
export NO_PROXY=\$no_proxy
export HF_ENDPOINT="$HF_ENDPOINT"
EOF

cat > /etc/environment <<EOF
http_proxy=http://127.0.0.1:$HTTP_PORT
https_proxy=http://127.0.0.1:$HTTP_PORT
all_proxy=http://127.0.0.1:$HTTP_PORT
no_proxy=$NO_PROXY
HTTP_PROXY=http://127.0.0.1:$HTTP_PORT
HTTPS_PROXY=http://127.0.0.1:$HTTP_PORT
ALL_PROXY=http://127.0.0.1:$HTTP_PORT
NO_PROXY=$NO_PROXY
HF_ENDPOINT=$HF_ENDPOINT
EOF

grep -q 'source /etc/profile.d/00-proxy.sh' /root/.bashrc 2>/dev/null || \
  echo 'source /etc/profile.d/00-proxy.sh' >> /root/.bashrc

mkdir -p /etc/pip /root/.config/pip
cat > /etc/pip/pip.conf <<EOF
[global]
index-url = $PIP_INDEX
timeout = 120
EOF
cp /etc/pip/pip.conf /root/.config/pip/pip.conf 2>/dev/null || true

mkdir -p /root/.pip
cat > /root/.pip/pip.conf <<EOF
[global]
index-url = $PIP_INDEX
timeout = 120
EOF

if [ -d /etc/apt ]; then
  cat > /etc/apt/apt.conf.d/95-proxy-bypass <<EOF
Acquire::http::Proxy::mirrors.ustc.edu.cn "DIRECT";
Acquire::https::Proxy::mirrors.ustc.edu.cn "DIRECT";
Acquire::http::Proxy::mirrors.ustc.edu.cn "DIRECT";
Acquire::https::Proxy::mirrors.ustc.edu.cn "DIRECT";
Acquire::http::Proxy::mirrors.aliyun.com "DIRECT";
Acquire::http::Proxy::mirrors.tuna.tsinghua.edu.cn "DIRECT";
Acquire::http::Proxy::mirrors.cloud.tencent.com "DIRECT";
Acquire::http::Proxy::pypi.virtaicloud.com "DIRECT";
EOF
fi

cat > /root/.gitconfig <<EOF
[http]
    proxy = http://127.0.0.1:$HTTP_PORT
[https]
    proxy = http://127.0.0.1:$HTTP_PORT
EOF

cat > /root/.wgetrc <<EOF
use_proxy = on
http_proxy = http://127.0.0.1:$HTTP_PORT
https_proxy = http://127.0.0.1:$HTTP_PORT
no_proxy = $NO_PROXY
EOF

cat > /root/.curlrc <<EOF
proxy = http://127.0.0.1:$HTTP_PORT
noproxy = $NO_PROXY
EOF

mkdir -p /etc/proxychains4
cat > /etc/proxychains4/proxychains.conf <<EOF
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5 127.0.0.1 $SOCKS_PORT
EOF
cp /etc/proxychains4/proxychains.conf /etc/proxychains.conf 2>/dev/null || true

cat > /usr/local/bin/proxy-mode <<'EOF'
#!/bin/bash
case "$1" in
  on)
    source /etc/profile.d/00-proxy.sh
    echo "proxy ON: $https_proxy"
    ;;
  off)
    unset http_proxy https_proxy all_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
    echo "proxy OFF"
    ;;
  status)
    [ -n "${https_proxy:-}" ] && echo "proxy ON: $https_proxy" || echo "proxy OFF"
    ;;
  *)
    echo "usage: proxy-mode {on|off|status}" >&2; exit 1;;
esac
EOF
chmod +x /usr/local/bin/proxy-mode

echo "=== env configured ==="
echo "PIP_INDEX=$PIP_INDEX"
echo "HF_ENDPOINT=$HF_ENDPOINT"
echo "NO_PROXY=$NO_PROXY"
echo
echo "Test in new shell: bash -lc 'echo \$https_proxy'"
echo "Switch: proxy-mode {on|off|status}"
