import type { DBServer } from '../db/schema';

export interface ReachableProxy {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  latency_ms: number | null;
  region?: string | null;
  target_scores?: string | null;
}

export interface ProxySpeedTestEntry {
  proxy_id: string;
  proxy_name: string;
  proxy_url: string;
  region: string;
  test_command: string;
}

export interface ProxyAcceleration {
  proxy: ReachableProxy;
  commands: {
    env: string;
    proxychains: string;
    git: string;
    wget: string;
    pip: string;
    aria2c: string;
  };
}

export interface JumpRelay {
  jump_server: { id: string; name: string; host: string; port: number; username: string };
  steps: string[];
}

export interface NetworkRelayResult {
  target_domain_info: {
    domain: string;
    category: 'AI_MODELS' | 'CODE_REPOS' | 'STORAGE_S3' | 'MIRRORS_DOMESTIC' | 'GENERAL';
    recommendation: string;
  };
  download_strategy_workflow: string[];
  proxy_acceleration?: ProxyAcceleration;
  direct_vs_proxy_speed_test?: {
    description: string;
    direct_test_command: string;
    proxy_entries: ProxySpeedTestEntry[];
    benchmark_and_pick_fastest_script: string;
  };
  multi_proxy_chunk_downloader?: {
    description: string;
    python_script_name: string;
    python_script_content: string;
    execution_command: string;
  };
  unified_proxy_env_wrapper?: {
    description: string;
    script_name: string;
    script_content: string;
  };
  jump_relay?: JumpRelay;
  local_fallback?: {
    description: string;
    upload_command: string;
  };
  post_download_step: string;
  how_to: string;
}

function proxyUrl(p: ReachableProxy): string {
  return `${p.protocol}://${p.host}:${p.port}`;
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    const m = url.match(/https?:\/\/([^/:]+)/i);
    return m ? m[1].toLowerCase() : 'unknown';
  }
}

export function categorizeDomain(domain: string): {
  category: 'AI_MODELS' | 'CODE_REPOS' | 'STORAGE_S3' | 'MIRRORS_DOMESTIC' | 'GENERAL';
  recommendation: string;
} {
  const d = domain.toLowerCase();
  if (d.includes('huggingface.co') || d.includes('hf.co') || d.includes('civitai.com') || d.includes('modelscope.cn')) {
    if (d.includes('modelscope.cn')) {
      return { category: 'MIRRORS_DOMESTIC', recommendation: '国内模型源，优先推荐【直连通道】或国内专线下载。' };
    }
    return { category: 'AI_MODELS', recommendation: '海外大型模型/权重仓库，推荐【多代理分片并发拉取】或优选 HK/JP/US 高带宽代理通道。' };
  }
  if (d.includes('github.com') || d.includes('raw.githubusercontent.com') || d.includes('gitlab.com')) {
    return { category: 'CODE_REPOS', recommendation: '海外代码仓库，直连易丢包限速，推荐使用代理加速或多代理竞速。' };
  }
  if (d.includes('s3.amazonaws.com') || d.includes('blob.core.windows.net') || d.includes('r2.cloudflarestorage.com')) {
    return { category: 'STORAGE_S3', recommendation: '云对象存储资源，支持并发 Range 分片下载，推荐使用【多代理分片并发拉取】聚合带宽。' };
  }
  if (d.includes('aliyun.com') || d.includes('tsinghua.edu.cn') || d.includes('ustc.edu.cn') || d.includes('163.com') || d.includes('tencent.com')) {
    return { category: 'MIRRORS_DOMESTIC', recommendation: '国内高速镜像源，强烈推荐直接使用【直连极速下载】。' };
  }
  return { category: 'GENERAL', recommendation: '通用下载资源，推荐对直连和代理池进行实时并发测速，哪个快选哪个。' };
}

export function buildProxyAcceleration(proxy: ReachableProxy, resourceUrl: string): ProxyAcceleration {
  const u = proxyUrl(proxy);
  return {
    proxy,
    commands: {
      env: `export http_proxy="${u}" https_proxy="${u}" ALL_PROXY="${u}"`,
      proxychains: `proxychains4 wget "${resourceUrl}"`,
      git: `git config --global http.proxy "${u}"`,
      wget: `wget -e use_proxy=yes -e https_proxy="${u}" "${resourceUrl}"`,
      pip: `pip install --proxy "${u}" <pkg>`,
      aria2c: `aria2c --all-proxy="${u}" -s 16 -x 16 "${resourceUrl}"`,
    },
  };
}

export function buildJumpRelay(jump: DBServer, target: DBServer, resourceUrl: string): JumpRelay {
  return {
    jump_server: { id: jump.id, name: jump.name, host: jump.host, port: jump.port, username: jump.username },
    steps: [
      `在跳板机 ${jump.host}: wget "${resourceUrl}" -O /tmp/payload`,
      `从跳板机传到目标机: scp -3 /tmp/payload ${target.username}@${target.host}:~/shared/ (或目标项目目录)`,
    ],
  };
}

export function buildMultiProxyDownloaderScript(proxies: ReachableProxy[]): string {
  const proxyListJson = JSON.stringify(proxies.map(p => ({
    name: p.name,
    url: proxyUrl(p),
    protocol: p.protocol,
    region: p.region || 'UNKNOWN',
  })));

  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multi-Proxy Chunk-Aggregated Fast Downloader with Dynamic Failover & Resume
Zero third-party dependencies — Pure Python 3 Standard Library
"""

import sys, os, time, json, subprocess, shutil, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

PROXIES = ${proxyListJson}

CHUNK_SIZE = 64 * 1024 * 1024  # 64 MB per chunk

def get_file_info(url, timeout=15):
    req = urllib.request.Request(url, method='HEAD')
    req.add_header('User-Agent', 'Mozilla/5.0 (GPU Cluster Multi-Proxy Downloader)')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            total_length = int(resp.headers.get('Content-Length', 0))
            accept_ranges = 'bytes' in resp.headers.get('Accept-Ranges', '').lower()
            return total_length, accept_ranges
    except Exception as e:
        print(f"⚠️ HEAD request failed ({e}), trying GET with Range: bytes=0-0...")
        req = urllib.request.Request(url)
        req.add_header('Range', 'bytes=0-0')
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content_range = resp.headers.get('Content-Range', '')
            if '/' in content_range:
                total_length = int(content_range.split('/')[-1])
                return total_length, True
            return 0, False

def download_chunk(url, chunk_idx, start_byte, end_byte, out_part_file, proxy_url=None, max_retries=3):
    if os.path.exists(out_part_file):
        actual_size = os.path.getsize(out_part_file)
        expected_size = end_byte - start_byte + 1
        if actual_size == expected_size:
            return chunk_idx, True, f"Chunk {chunk_idx} already complete (resumed)"
    
    tmp_file = out_part_file + '.tmp'
    has_curl = shutil.which('curl') is not None

    for attempt in range(max_retries):
        try:
            t0 = time.time()
            if has_curl:
                # Use curl with native SOCKS5 / HTTP proxy & Range support
                cmd = ['curl', '-s', '-L', '--max-time', '60', '-r', f'{start_byte}-{end_byte}']
                if proxy_url and proxy_url != 'DIRECT':
                    cmd.extend(['-x', proxy_url])
                cmd.extend(['-o', tmp_file, url])
                res = subprocess.run(cmd, timeout=65)
                if res.returncode != 0:
                    raise RuntimeError(f"curl exited with code {res.returncode}")
            else:
                req = urllib.request.Request(url)
                req.add_header('Range', f'bytes={start_byte}-{end_byte}')
                req.add_header('User-Agent', 'Mozilla/5.0 (GPU Cluster Multi-Proxy Downloader)')
                handlers = []
                if proxy_url and proxy_url != 'DIRECT':
                    handlers.append(urllib.request.ProxyHandler({'http': proxy_url, 'https': proxy_url}))
                opener = urllib.request.build_opener(*handlers)
                with opener.open(req, timeout=30) as resp, open(tmp_file, 'wb') as f:
                    while True:
                        block = resp.read(64 * 1024)
                        if not block: break
                        f.write(block)

            if os.path.exists(tmp_file) and os.path.getsize(tmp_file) > 0:
                os.replace(tmp_file, out_part_file)
                downloaded = os.path.getsize(out_part_file)
                elapsed = max(time.time() - t0, 0.001)
                speed_mb = (downloaded / (1024 * 1024)) / elapsed
                return chunk_idx, True, f"Chunk {chunk_idx} ({downloaded/(1024*1024):.1f}MB) via [{proxy_url or 'DIRECT'}] in {elapsed:.1f}s ({speed_mb:.2f} MB/s)"
        except Exception as e:
            if os.path.exists(tmp_file):
                try: os.remove(tmp_file)
                except: pass
            time.sleep(1)
            
    return chunk_idx, False, f"Chunk {chunk_idx} failed after {max_retries} attempts"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 multi_proxy_downloader.py <URL> [OUTPUT_FILENAME]")
        sys.exit(1)
        
    url = sys.argv[1]
    filename = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(url.split('?')[0]) or 'downloaded_file.bin'
    
    print(f"🚀 [Multi-Proxy Aggregator] Starting download: {filename}")
    print(f"🔗 URL: {url}")
    
    total_size, supports_range = get_file_info(url)
    print(f"📦 Total size: {total_size / (1024*1024):.2f} MB | Supports Range: {supports_range}")
    
    # Candidate channels (DIRECT + PROXIES)
    channels = ['DIRECT'] + [p['url'] for p in PROXIES if p.get('url')]
    print(f"⚡ Available channels in pool: {len(channels)} (Direct + {len(channels)-1} Proxies)")
    
    if not supports_range or total_size <= 0:
        print("⚠️ Server does not support Range requests or size is unknown. Falling back to single-stream download...")
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as resp, open(filename, 'wb') as f:
            while chunk := resp.read(64 * 1024):
                f.write(chunk)
        print("✔ Download finished!")
        return

    # Calculate chunks
    chunks = []
    chunk_idx = 0
    start = 0
    while start < total_size:
        end = min(start + CHUNK_SIZE - 1, total_size - 1)
        part_name = f"{filename}.part_{chunk_idx}"
        chunks.append((chunk_idx, start, end, part_name))
        start = end + 1
        chunk_idx += 1

    print(f"🧩 File split into {len(chunks)} chunks ({CHUNK_SIZE/(1024*1024)}MB per chunk)")

    # Download chunks across channels
    max_workers = min(len(channels) * 2, 16)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for idx, s, e, part_name in chunks:
            assigned_channel = channels[idx % len(channels)]
            f = executor.submit(download_chunk, url, idx, s, e, part_name, assigned_channel)
            futures[f] = (idx, s, e, part_name)

        for f in as_completed(futures):
            c_idx, success, msg = f.result()
            print(f"  [{'✔' if success else '❌'}] {msg}")
            if not success:
                # Failover retry with DIRECT
                orig = futures[f]
                print(f"  🔄 Failover chunk {c_idx} to DIRECT retry...")
                download_chunk(url, orig[0], orig[1], orig[2], orig[3], 'DIRECT')

    # Merge parts
    print("🔨 Merging all parts into final file...")
    with open(filename, 'wb') as out_f:
        for idx, _, _, part_name in chunks:
            if not os.path.exists(part_name):
                raise RuntimeError(f"Missing part file {part_name}!")
            with open(part_name, 'rb') as pf:
                while b := pf.read(1024 * 1024):
                    out_f.write(b)
            try: os.remove(part_name)
            except: pass

    print(f"🎉 SUCCESS! File completely assembled: {filename} ({os.path.getsize(filename)/(1024*1024):.2f} MB)")

if __name__ == '__main__':
    main()
`;
}

export function buildUnifiedProxyEnvScript(bestProxyUrl: string): string {
  return `#!/usr/bin/env bash
# === Unified GPU Server Proxy Environment Suite ===
# Usage: source proxy_env.sh on | source proxy_env.sh off

TARGET_PROXY="${bestProxyUrl}"

proxy_on() {
    export http_proxy="$TARGET_PROXY"
    export https_proxy="$TARGET_PROXY"
    export ftp_proxy="$TARGET_PROXY"
    export rsync_proxy="$TARGET_PROXY"
    export ALL_PROXY="$TARGET_PROXY"
    export NO_PROXY="localhost,127.0.0.1,localaddress,.localdomain.com"
    export no_proxy="localhost,127.0.0.1,localaddress,.localdomain.com"
    
    # Git proxy
    git config --global http.proxy "$TARGET_PROXY"
    git config --global https.proxy "$TARGET_PROXY"
    
    # Pip proxy
    pip config set global.proxy "$TARGET_PROXY" 2>/dev/null || true
    
    # Hugging Face fast transfer
    export HF_HUB_ENABLE_HF_TRANSFER=1
    
    echo "✔ Unified Proxy is now ENABLED -> $TARGET_PROXY"
}

proxy_off() {
    unset http_proxy https_proxy ftp_proxy rsync_proxy ALL_PROXY NO_PROXY no_proxy HF_HUB_ENABLE_HF_TRANSFER
    git config --global --unset http.proxy 2>/dev/null || true
    git config --global --unset https.proxy 2>/dev/null || true
    pip config unset global.proxy 2>/dev/null || true
    echo "✔ Unified Proxy is now DISABLED (Direct Mode)"
}

if [ "$1" = "off" ]; then
    proxy_off
else
    proxy_on
fi
`;
}

export function planRelay(
  target: DBServer,
  resourceUrl: string,
  reachableProxies: ReachableProxy[],
  jumpCandidates: DBServer[]
): NetworkRelayResult {
  const domain = extractDomain(resourceUrl);
  const domainInfo = categorizeDomain(domain);

  const workflow = [
    '第 1 步【检索 Workers RAG 数据池与集群缓存】：调用 query_backup_index 检索 Workers RAG 数据池，结合 get_servers datasets 查看各机缓存。命中则直接提取或利用 Dataset Affinity 就近调度。',
    '第 2 步【网络检索直链】：若 RAG 与集群内均无数据，使用 anysearch 或 Cloudflare Browser (/browser) 在全网 (HuggingFace/ModelScope/GitHub) 检索真实下载链接。',
    '第 3 步【直连 vs. 代理 并发测速竞速 (哪个快选哪个)】：若配置了代理池，同时对【直连通道】与【各个代理节点】测速。若直连更快则直接直连下载；若代理更快则自动切入最快代理加速下载。若无代理则直接直连下载。',
    '第 4 步【多代理分片并发聚合拉取 (针对 >500MB 大文件)】：对大型权重/数据集，执行 multi_proxy_downloader.py 将文件切为 64MB/Chunk，由池内多个代理（含直连）同时拉取合并，并支持自动断点续传与故障转移。',
    '第 5 步【本地下载中转保底】：若网络完全检索不到（如需私有权限或特殊网络），在本地物理机下载后通过 scp/rsync 上传至服务器。',
    '第 6 步【必须执行·就地登记】：下载完成后立即调用 register_dataset 登记，供后续任务复用与 Dataset Affinity 亲和调度。'
  ];

  const result: NetworkRelayResult = {
    target_domain_info: {
      domain,
      category: domainInfo.category,
      recommendation: domainInfo.recommendation,
    },
    download_strategy_workflow: workflow,
    post_download_step: `下载完成后，必须在目标机调用 register_dataset { server_id: "${target.id}", name: "<数据集名称>", path: "<绝对路径>", size_gb: <大小> } 登记至集体记忆池。`,
    local_fallback: {
      description: '当网络完全检索不到直链或需要本地特殊凭据时，在本地物理机下载并通过 scp 上传：',
      upload_command: `scp -P ${target.port || 22} ./local_file ${target.username}@${target.host}:~/shared/datasets/ (或 ~/projects/...)`,
    },
    how_to: `目标域名: ${domain} (${domainInfo.category})。建议策略: ${domainInfo.recommendation}`,
  };

  if (reachableProxies.length > 0) {
    const sorted = [...reachableProxies].sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity));
    const best = sorted[0];
    const bestUrl = proxyUrl(best);
    result.proxy_acceleration = buildProxyAcceleration(best, resourceUrl);

    // Build direct vs proxy speed test commands and bash auto-ranking snippet
    const proxyEntries: ProxySpeedTestEntry[] = sorted.map(p => {
      const u = proxyUrl(p);
      return {
        proxy_id: p.id,
        proxy_name: p.name,
        proxy_url: u,
        region: p.region || 'UNKNOWN',
        test_command: `curl -x "${u}" -s -w "Proxy: ${p.name} (${p.region || 'UN'}) | Speed: %{speed_download} B/s | Time: %{time_total}s\\n" -o /dev/null --max-time 8 "${resourceUrl}"`,
      };
    });

    const proxyListBash = sorted.map(p => `"${proxyUrl(p)}"`).join(' ');
    const benchmarkScript = [
      `# === 直连 vs. 代理池全节点并发测速竞速脚本 (哪个快选哪个) ===`,
      `echo "🔍 正在对【直连通道】与 ${sorted.length} 个【Workers 代理节点】进行下载测速竞速..."`,
      ``,
      `# 1. 测速直连`,
      `DIRECT_SPEED=$(curl -s -w "%{speed_download}" -o /dev/null --max-time 10 "${resourceUrl}" 2>/dev/null || echo 0)`,
      `DIRECT_SPEED_NUM=$(echo "$DIRECT_SPEED" | cut -d'.' -f1)`,
      `echo "  ⚡ 直连通道 -> 实测速度: $DIRECT_SPEED B/s"`,
      ``,
      `BEST_MODE="DIRECT"`,
      `MAX_SPEED=$DIRECT_SPEED_NUM`,
      `BEST_PROXY=""`,
      ``,
      `# 2. 测速各个代理节点`,
      `PROXIES=(${proxyListBash})`,
      `for P in "\${PROXIES[@]}"; do`,
      `  P_SPEED=$(curl -x "$P" -s -w "%{speed_download}" -o /dev/null --max-time 10 "${resourceUrl}" 2>/dev/null || echo 0)`,
      `  P_SPEED_NUM=$(echo "$P_SPEED" | cut -d'.' -f1)`,
      `  echo "  ⚡ 代理 $P -> 实测速度: $P_SPEED B/s"`,
      `  if [ "$P_SPEED_NUM" -gt "$MAX_SPEED" ]; then`,
      `    MAX_SPEED=$P_SPEED_NUM`,
      `    BEST_MODE="PROXY"`,
      `    BEST_PROXY=$P`,
      `  fi`,
      `done`,
      ``,
      `# 3. 动态竞速裁决 (哪个快选哪个)`,
      `if [ "$BEST_MODE" = "PROXY" ] && [ -n "$BEST_PROXY" ]; then`,
      `  echo "🚀 代理胜出！优选最快代理: $BEST_PROXY (速度: $MAX_SPEED B/s)"`,
      `  export http_proxy="$BEST_PROXY" https_proxy="$BEST_PROXY" ALL_PROXY="$BEST_PROXY"`,
      `  aria2c --all-proxy="$BEST_PROXY" -s 16 -x 16 "${resourceUrl}" || wget "${resourceUrl}"`,
      `else`,
      `  echo "🚀 直连胜出！(直连速度: $DIRECT_SPEED_NUM B/s >= 所有代理)，采用直连极速下载"`,
      `  unset http_proxy https_proxy ALL_PROXY`,
      `  aria2c -s 16 -x 16 "${resourceUrl}" || wget "${resourceUrl}" || curl -O "${resourceUrl}"`,
      `fi`,
    ].join('\n');

    result.direct_vs_proxy_speed_test = {
      description: '对直连通道与 Workers 代理池各节点进行同源实时测速竞速，自动选取速度最高通道执行下载：',
      direct_test_command: `curl -s -w "Direct Speed: %{speed_download} B/s | Time: %{time_total}s\\n" -o /dev/null --max-time 8 "${resourceUrl}"`,
      proxy_entries: proxyEntries,
      benchmark_and_pick_fastest_script: benchmarkScript,
    };

    // Multi-proxy chunk aggregator
    result.multi_proxy_chunk_downloader = {
      description: '针对超大模型权重与数据集 (>500MB)，将大文件切分并发分配给池内多代理（含直连）聚合拉取，榨干所有代理总带宽，支持自动故障转移与断点续传：',
      python_script_name: 'multi_proxy_downloader.py',
      python_script_content: buildMultiProxyDownloaderScript(sorted),
      execution_command: `python3 multi_proxy_downloader.py "${resourceUrl}"`,
    };

    // Unified proxy environment wrapper
    result.unified_proxy_env_wrapper = {
      description: '一键接管 Shell/Git/Pip/Python 代理环境变量脚本：',
      script_name: 'proxy_env.sh',
      script_content: buildUnifiedProxyEnvScript(bestUrl),
    };
  }

  const jump = jumpCandidates.find(s =>
    s.id !== target.id && s.status_online === 1 &&
    (s.direct_when_no_proxy === 1 || (s.v2ray_available === 1 && s.direct_when_proxy_available === 1))
  );
  if (jump) result.jump_relay = buildJumpRelay(jump, target, resourceUrl);

  return result;
}
