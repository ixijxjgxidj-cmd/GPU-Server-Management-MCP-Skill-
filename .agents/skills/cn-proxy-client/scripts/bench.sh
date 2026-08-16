#!/bin/bash
# Measure pip / HuggingFace / apt sources — direct vs node. Print winner table.
# Run AFTER deploy.sh so the proxy is listening. Timeout 500s.
set -eu
export PATH=/usr/local/bin:/root/miniconda3/bin:/opt/conda/bin:$PATH
PROXY=http://127.0.0.1:10809
SOCKS=socks5h://127.0.0.1:10808

kv(){ printf '%-20s %s\n' "$1" "$2"; }
speed(){ awk '{if($1>0) printf "%.2f MB/s",$1/1048576; else print "FAIL"}'; }

echo "=== pip indexes (cold 50MB torch download) ==="
for src in node:pypi.org tuna:tuna.tsinghua.edu.cn aliyun:mirrors.aliyun.com tencent:mirrors.cloud.tencent.com; do
  name=${src%%:*} url=https://${src#*:}/simple
  t0=$(date +%s)
  if timeout 120 pip download --no-cache-dir --index-url "$url" --dest /tmp/.bench-pip torch==2.0.0 >/dev/null 2>&1; then
    dt=$(($(date +%s)-t0))
    # torch 2.0.0 wheel ~502 MB
    kv "$name" "$(echo "502*1048576/$dt" | bc 2>/dev/null | speed)"
  else
    kv "$name" "TIMEOUT/FAIL"
  fi
  rm -rf /tmp/.bench-pip 2>/dev/null
done

echo
echo "=== HuggingFace (30MB model shard, cold) ==="
for src in node:huggingface.co mirror:hf-mirror.com; do
  name=${src%%:*} base=https://${src#*:}
  # bert-base-uncased has a ~440MB pytorch_model.bin
  url="$base/bert-base-uncased/resolve/main/pytorch_model.bin"
  t0=$(date +%s)
  sz=$(timeout 90 curl -sS --max-time 80 -o /tmp/.bench-hf -w '%{size_download}' "$url" 2>/dev/null || echo 0)
  dt=$(($(date +%s)-t0))
  [ "$sz" -gt 100000 ] && kv "$name" "$(echo "$sz/$dt" | bc 2>/dev/null | speed)" || kv "$name" "FAIL"
  rm -f /tmp/.bench-hf 2>/dev/null
done

echo
echo "=== apt mirrors (20MB test, indices.ubuntu.com) ==="
for src in node:direct aliyun:mirrors.aliyun.com tuna:mirrors.tuna.tsinghua.edu.cn; do
  name=${src%%:*}
  if [ "$name" = "node" ]; then
    url="http://archive.ubuntu.com/ubuntu/dists/jammy/main/binary-amd64/Packages.xz"
  else
    url="http://${src#*:}/ubuntu/dists/jammy/main/binary-amd64/Packages.xz"
  fi
  t0=$(date +%s)
  sz=$(timeout 60 curl -sS --max-time 50 -o /tmp/.bench-apt -w '%{size_download}' "$url" 2>/dev/null || echo 0)
  dt=$(($(date +%s)-t0))
  [ "$sz" -gt 100000 ] && kv "$name" "$(echo "$sz/$dt" | bc 2>/dev/null | speed)" || kv "$name" "FAIL"
  rm -f /tmp/.bench-apt 2>/dev/null
done

echo
echo "=== VERDICT (feed to env.sh) ==="
echo "Compare numbers above. Typical winners per box:"
echo "  deepln/virtai → node wins pip+HF, aliyun wins apt"
echo "  zzai → hf-mirror wins HF, node wins pip, tuna wins apt"
echo "Put winners in NO_PROXY, losers through proxy."
