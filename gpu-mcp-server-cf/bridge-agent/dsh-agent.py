#!/usr/bin/env python3
"""
DSH jump-box probe agent (pull model).

Cloudflare Workers can't open SSH sockets, so this agent runs on a reachable
jump-box and does the probing on the Worker's behalf:

  1. GET  {WORKER}/api/bridge/tasks   -> list of servers + ssh_plan + probe_script
  2. For each target, SSH in and run the probe (direct first, then each socks5
     proxy via a ProxyCommand) — stop at the first mode that connects.
  3. POST {WORKER}/api/bridge/report  -> online status + live load + hardware.

The jump-box cannot reach workers.dev directly, so ALL Worker HTTP calls go
through a socks5 proxy (curl --socks5-hostname user:pass@host:port). Target-side
SSH that needs a proxy uses the same proxies via a tiny stdlib socks5 relay
exposed as an ssh ProxyCommand (OpenSSH's nc has no -X on this box).

Only depends on: python3 stdlib + system `ssh`/`curl`. No pip installs.
Config is read from /etc/dsh-agent.env (KEY=VALUE), written by install.sh.
"""
import base64
import json
import os
import re
import select
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time

CFG = {}
for line in open(os.environ.get('DSH_AGENT_ENV', '/etc/dsh-agent.env'), encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        CFG[k.strip()] = v.strip()

WORKER = CFG['WORKER_URL'].rstrip('/')
TOKEN = CFG['BRIDGE_TOKEN']
# EGRESS_PROXY: socks5 the jump-box uses to reach the Worker, host:port[:user:pass]
EGRESS = CFG.get('EGRESS_PROXY', '')
SSH_TIMEOUT = int(CFG.get('SSH_TIMEOUT', '20'))
JUMP_HOST = CFG.get('JUMP_HOST', '')

KEYDIR = tempfile.mkdtemp(prefix='dsh_keys_')


def log(*a):
    print('[dsh-agent]', *a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------------------
# Worker HTTP via curl through the egress socks5 proxy.
# ---------------------------------------------------------------------------
def _curl_socks(args):
    base = ['curl', '-s', '-m', '30']
    if EGRESS:
        parts = EGRESS.split(':')
        host, port = parts[0], parts[1]
        auth = ''
        if len(parts) >= 4:
            auth = f'{parts[2]}:{parts[3]}@'
        base += ['--socks5-hostname', f'{auth}{host}:{port}']
    return subprocess.run(base + args, capture_output=True, text=True, timeout=60)


def worker_get_tasks():
    args = ['-H', f'Authorization: Bearer {TOKEN}']
    url = f'{WORKER}/api/bridge/tasks'
    if JUMP_HOST:
        url += f'?jump_host={JUMP_HOST}'
    r = _curl_socks(args + [url])
    if r.returncode != 0:
        raise RuntimeError(f'curl tasks failed rc={r.returncode}: {r.stderr[:200]}')
    return json.loads(r.stdout)


def worker_post_report(results):
    payload = json.dumps({'results': results})
    args = ['-H', f'Authorization: Bearer {TOKEN}', '-H', 'Content-Type: application/json',
            '-X', 'POST', '--data-binary', payload, f'{WORKER}/api/bridge/report']
    r = _curl_socks(args)
    if r.returncode != 0:
        raise RuntimeError(f'curl report failed rc={r.returncode}: {r.stderr[:200]}')
    return json.loads(r.stdout)


# ---------------------------------------------------------------------------
# Pure-stdlib socks5 -> TCP relay, exposed to ssh as a ProxyCommand.
# OpenSSH here has no `nc -X`, so we implement the client side of socks5 and
# splice stdin/stdout, letting `ssh -o ProxyCommand=...` tunnel through it.
# ---------------------------------------------------------------------------
SOCKS_HELPER = r'''
import socket, struct, sys, select
ph, pp = sys.argv[1], int(sys.argv[2])
pu = sys.argv[3] if len(sys.argv) > 3 else ''
pw = sys.argv[4] if len(sys.argv) > 4 else ''
th, tp = sys.argv[5], int(sys.argv[6])
s = socket.create_connection((ph, pp), timeout=20)
methods = b'\x00' + (b'\x02' if pu else b'')
s.sendall(b'\x05' + bytes([len(methods)]) + methods)
hdr = s.recv(2)
if len(hdr) < 2:
    sys.exit(2)
if hdr[1] == 2:
    s.sendall(b'\x01' + bytes([len(pu)]) + pu.encode() + bytes([len(pw)]) + pw.encode())
    if s.recv(2)[1] != 0:
        sys.exit(3)
host = th.encode()
s.sendall(b'\x05\x01\x00\x03' + bytes([len(host)]) + host + struct.pack('>H', tp))
rep = s.recv(4)
if len(rep) < 4 or rep[1] != 0:
    sys.exit(4)
atyp = rep[3]
n = 4 if atyp == 1 else (16 if atyp == 4 else s.recv(1)[0])
s.recv(n); s.recv(2)   # bound addr + port
fin = sys.stdin.buffer.raw
fout = sys.stdout.buffer.raw
s.setblocking(False)
srv_open = True
while srv_open:
    r, _, _ = select.select([s, fin], [], [], 120)
    if not r:
        break
    if s in r:
        try:
            d = s.recv(65536)
        except (BlockingIOError, InterruptedError):
            d = None
        if d == b'':
            break            # remote closed
        if d:
            fout.write(d); fout.flush()
    if fin in r:
        d = fin.read(65536)
        if not d:
            break            # local (ssh) closed
        s.sendall(d)
try:
    s.close()
except Exception:
    pass
'''


def write_socks_helper():
    p = os.path.join(KEYDIR, 'socks_pc.py')
    with open(p, 'w') as f:
        f.write(SOCKS_HELPER)
    return p


SOCKS_PC = write_socks_helper()


def key_file_for(t):
    if t.get('key_path') and os.path.exists(t['key_path']):
        return t['key_path']
    if t.get('key_content_b64'):
        p = os.path.join(KEYDIR, f"k_{t['server_id']}")
        with open(p, 'wb') as f:
            f.write(base64.b64decode(t['key_content_b64']))
        os.chmod(p, 0o600)
        return p
    return None


def build_ssh_cmd(t, step, probe, legacy=False, js_mode=None):
    host, port, user = t['host'], int(t['port']), t['username']
    is_tmate = host.endswith('.tmate.io') or 'tmate' in str(t.get('tags') or '').lower() or 'tmate' in (t.get('name') or '').lower()
    is_tunnel = t.get('connection_type') in ('tunnel', 'cloudflare_tunnel') or is_tmate

    common = ['ssh', '-p', str(port),
              '-o', 'BatchMode=yes' if (t['auth_method'] == 'key' or is_tmate) and not js_mode else 'BatchMode=no',
              '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null',
              '-o', f'ConnectTimeout={SSH_TIMEOUT}', '-o', 'NumberOfPasswordPrompts=1']
    if legacy:
        # Compatibility profile for non-OpenSSH servers (Go/Dropbear/embedded and
        # older sshd): re-enable ssh-rsa/SHA-1, legacy KEX, and CBC/3DES so the
        # modern client can still negotiate. Harmless against modern servers.
        common += [
            '-o', 'HostKeyAlgorithms=+ssh-rsa,ssh-dss',
            '-o', 'PubkeyAcceptedAlgorithms=+ssh-rsa,ssh-dss',
            '-o', 'KexAlgorithms=+diffie-hellman-group14-sha1,diffie-hellman-group1-sha1,diffie-hellman-group-exchange-sha1',
            '-o', 'Ciphers=+aes256-cbc,aes128-cbc,3des-cbc',
            '-o', 'MACs=+hmac-sha1,hmac-sha1-96',
        ]
    if step['mode'] == 'socks5':
        pc = f'python3 {SOCKS_PC} {step["proxy_host"]} {step["proxy_port"]} ' \
             f'{step.get("proxy_username") or ""} {step.get("proxy_password") or ""} %h %p'
        common += ['-o', f'ProxyCommand={pc}']
    elif step['mode'] == 'cloudflared':
        # Cloudflare Tunnel: host is the tunnel hostname; SSH rides on cloudflared.
        # cloudflared must be installed + logged in on the jump-box. If it's absent
        # this step fails fast (ProxyCommand exec error) and the next step runs.
        common += ['-o', f'ProxyCommand=cloudflared access ssh --hostname %h']
    keyf = key_file_for(t)
    if t['auth_method'] == 'key' and keyf and not is_tmate:
        common += ['-i', keyf]
    
    # JumpServer direct command execution syntax:
    # JumpServer allows passing target asset or menu index directly in command string:
    # e.g., ssh user@jumpserver "1 <probe>" or ssh user@jumpserver "<target_host> '<probe>'"
    if js_mode == 'direct':
        target = str(t.get('jumpserver_target') or '1')
        common += [f'{user}@{host}', f"{target} {probe}"]
    elif js_mode == 'menu':
        common += [f'{user}@{host}']
    else:
        common += [f'{user}@{host}', probe]
    return common


# Signals that the failure was protocol/algorithm negotiation, not auth or network
# — i.e. the server is a non-OpenSSH dialect worth retrying with the legacy profile.
_LEGACY_HINTS = (
    'no matching', 'their offer', 'key exchange', 'kex', 'cipher', 'mac ',
    'host key type', 'unable to negotiate', 'protocol', 'bad packet length',
    'incompatible', 'invalid format',
)


def _needs_legacy(stderr):
    s = (stderr or '').lower()
    return any(h in s for h in _LEGACY_HINTS)


def run_probe(t, probe):
    """Try each ssh_plan step until one connects. For every step, try the modern
    OpenSSH profile first, then a legacy-compat profile if negotiation looks like
    a non-OpenSSH server. Supports JumpServer direct target execution."""
    last_err = ''
    host = t.get('host', '')
    is_tmate = host.endswith('.tmate.io') or 'tmate' in str(t.get('tags') or '').lower() or 'tmate' in (t.get('name') or '').lower()
    is_js = bool(t.get('is_jumpserver') or 'jumpserver' in (t.get('notes') or '').lower())
    js_modes = ['direct', 'menu'] if is_js else [None]

    for step in t.get('ssh_plan', [{'mode': 'direct'}]):
        for js_mode in js_modes:
            for legacy in (False, True):
                cmd = build_ssh_cmd(t, step, probe, legacy=legacy, js_mode=js_mode)
                try:
                    if t['auth_method'] == 'password' and t.get('password') and not is_tmate:
                        r = _ssh_with_password(cmd, t['password'])
                    else:
                        stdin_data = f"{t.get('jumpserver_target') or '1'}\n{probe}\n" if js_mode == 'menu' else None
                        r = subprocess.run(cmd, input=stdin_data, capture_output=True, text=True, timeout=SSH_TIMEOUT + 15)
                except subprocess.TimeoutExpired:
                    last_err = f'{step["mode"]}{"/js_" + str(js_mode) if js_mode else ""}{"/legacy" if legacy else ""}: timeout'
                    continue
                out = (r.stdout or '')
                err_str = (r.stderr or '')
                if r.returncode == 0 and 'HOSTNAME=' in out:
                    via = 'direct' if step['mode'] == 'direct' else step.get('proxy_id')
                    return parse_probe(out), via, ''
                
                # JumpServer policy fallback: If the JumpServer gateway was reached and authenticated,
                # but non-interactive direct command execution is restricted by JumpServer security rules,
                # we still recognize the gateway as healthy/online rather than falsely marking offline.
                if is_js and ('jumpserver' in out.lower() or 'jumpserver' in err_str.lower() or 'authorized' in out.lower() or 'opt' in out.lower()):
                    via = 'direct' if step['mode'] == 'direct' else step.get('proxy_id')
                    return {}, via, ''

                last_err = f'{step["mode"]}{"/js_" + str(js_mode) if js_mode else ""}{"/legacy" if legacy else ""}: rc={r.returncode} {err_str[:120]}'
                # Only bother with the legacy retry when the modern attempt failed on
                # negotiation; auth/network failures won't be fixed by legacy options.
                if not legacy and not _needs_legacy(r.stderr):
                    break
    return None, None, last_err


def _ssh_with_password(cmd, password):
    """Password auth without sshpass: SSH_ASKPASS + setsid, DISPLAY set."""
    askpass = os.path.join(KEYDIR, 'ap.sh')
    with open(askpass, 'w') as f:
        f.write('#!/bin/sh\necho "$DSH_PW"\n')
    os.chmod(askpass, 0o700)
    env = dict(os.environ)
    env['DSH_PW'] = password
    env['SSH_ASKPASS'] = askpass
    env['SSH_ASKPASS_REQUIRE'] = 'force'
    env['DISPLAY'] = env.get('DISPLAY', ':0')
    # setsid detaches from tty so ssh uses SSH_ASKPASS
    full = ['setsid', '-w'] + cmd
    return subprocess.run(full, capture_output=True, text=True, timeout=SSH_TIMEOUT + 15, env=env, stdin=subprocess.DEVNULL)


def _to_int(v):
    try:
        return int(float(str(v).strip()))
    except Exception:
        return None


def _to_float(v):
    try:
        return round(float(str(v).strip()), 1)
    except Exception:
        return None


def parse_probe(out):
    kv = {}
    top_cpu = []
    env_items = []
    for line in out.splitlines():
        line = line.strip()
        # TOPCPU repeats (up to 3 lines): "TOPCPU=<%cpu>|<%mem>|<cmd>"
        if line.startswith('TOPCPU='):
            body = line[len('TOPCPU='):]
            parts = body.split('|', 2)
            if len(parts) == 3:
                top_cpu.append({
                    'cpu': _to_float(parts[0]),
                    'mem': _to_float(parts[1]),
                    'cmd': parts[2][:60],
                })
            continue
        # ENV_ITEM: "ENV_ITEM=<name>|<type>|<path>|<pyver>|<torch>|<cuda>|<pkgs>|<activate_cmd>"
        if line.startswith('ENV_ITEM='):
            body = line[len('ENV_ITEM='):]
            parts = body.split('|')
            if len(parts) >= 8:
                env_items.append({
                    'name': parts[0],
                    'type': parts[1],
                    'path': parts[2],
                    'python_version': parts[3] or None,
                    'torch_version': parts[4] or None,
                    'cuda_version': parts[5] or None,
                    'packages': [p for p in parts[6].split(',') if p],
                    'activate_cmd': parts[7],
                    'is_primary': False,
                })
            continue
        m = re.match(r'^([A-Z_]+)=(.*)$', line)
        if m:
            kv[m.group(1)] = m.group(2).strip()
    gpu_count = _to_int(kv.get('GPU_COUNT')) or 0
    load = {}
    hw = {}
    env = {}
    if _to_int(kv.get('GPU_UTIL')) is not None:
        load['gpu_util_pct'] = _to_int(kv.get('GPU_UTIL'))
    if _to_int(kv.get('GPU_MEM_FREE')) is not None:
        load['gpu_mem_free_gb'] = _to_int(kv.get('GPU_MEM_FREE'))
    if _to_int(kv.get('RAM_FREE')) is not None:
        load['ram_free_gb'] = _to_int(kv.get('RAM_FREE'))
    if _to_int(kv.get('DISK_FREE')) is not None:
        load['disk_free_gb'] = _to_int(kv.get('DISK_FREE'))
    if _to_int(kv.get('RUNNING')) is not None:
        load['running_tasks'] = _to_int(kv.get('RUNNING'))
    if gpu_count > 0 and kv.get('GPU_NAME'):
        hw['gpu_model'] = kv['GPU_NAME']
        hw['gpu_count'] = gpu_count
    if _to_int(kv.get('CPU')) is not None:
        hw['cpu_cores'] = _to_int(kv.get('CPU'))
    if _to_int(kv.get('RAM')) is not None:
        hw['ram_gb'] = _to_int(kv.get('RAM'))
    if _to_int(kv.get('DISK')) is not None:
        hw['disk_gb'] = _to_int(kv.get('DISK'))

    # Parse Mount Points and determine primary data volume
    mount_points = []
    primary_data_dir = None
    if kv.get('MOUNTS'):
        for m_str in kv['MOUNTS'].split(','):
            m_parts = m_str.strip().split(':')
            if len(m_parts) >= 3:
                m_path = m_parts[0]
                t_gb = _to_int(m_parts[1]) or 0
                f_gb = _to_int(m_parts[2]) or 0
                mount_points.append({
                    'mount': m_path,
                    'total_gb': t_gb,
                    'free_gb': f_gb,
                    'is_root': m_path == '/',
                    'is_primary': False,
                })
        candidates = [m for m in mount_points if not m['is_root'] and not m['mount'].startswith('/boot')]
        if candidates:
            candidates.sort(key=lambda x: (x['free_gb'], x['total_gb']), reverse=True)
            chosen = candidates[0]
            chosen['is_primary'] = True
            primary_data_dir = chosen['mount']
            load['disk_free_gb'] = chosen['free_gb']
            hw['disk_gb'] = chosen['total_gb']
        elif mount_points:
            mount_points[0]['is_primary'] = True
            primary_data_dir = mount_points[0]['mount']

    if mount_points:
        env['mount_points'] = json.dumps(mount_points)
    if primary_data_dir:
        env['primary_data_dir'] = primary_data_dir

    # Process discovered Python / Conda environments
    if env_items:
        def score_env(e):
            score = 0
            if e['torch_version']: score += 100
            if e['cuda_version']: score += 50
            if 'flash_attn' in e['packages'] or 'transformers' in e['packages']: score += 30
            score += len(e['packages']) * 5
            if e['type'] == 'conda': score += 10
            return score

        env_items.sort(key=score_env, reverse=True)
        primary = env_items[0]
        primary['is_primary'] = True

        env['environments'] = json.dumps(env_items)
        env['primary_env_cmd'] = primary['activate_cmd'] or primary['path']
        if primary.get('python_version'):
            env['python_version'] = primary['python_version']
        if primary.get('torch_version'):
            env['torch_version'] = primary['torch_version']
        if primary.get('cuda_version'):
            env['cuda_version'] = primary['cuda_version']
    else:
        # Fallback to direct versions if absent
        if kv.get('PYVER'):
            env['python_version'] = kv['PYVER']
        if kv.get('TORCH'):
            env['torch_version'] = kv['TORCH']

    cuda = env.get('cuda_version') or kv.get('CUDA') or kv.get('NVCC')
    if cuda:
        env['cuda_version'] = cuda

    return {'load': load, 'hardware': hw, 'env': env, 'top_cpu_tasks': top_cpu[:3]}


def main():
    t0 = time.time()
    tasks = worker_get_tasks()
    targets = tasks.get('targets', [])
    probe = tasks['probe_script']
    log(f'got {len(targets)} targets')
    results = []
    for t in targets:
        start = time.time()
        parsed, via, err = run_probe(t, probe)
        ping_ms = int((time.time() - start) * 1000)
        if parsed:
            results.append({
                'server_id': t['server_id'], 'host': t['host'], 'online': True,
                'ping_ms': ping_ms, 'connected_via': via,
                'load': parsed['load'], 'hardware': parsed['hardware'],
                'env': parsed['env'], 'top_cpu_tasks': parsed['top_cpu_tasks'],
            })
            log(f"OK  {t['name']} via {via} ({ping_ms}ms) load={parsed['load']} env={parsed['env']}")
        else:
            results.append({
                'server_id': t['server_id'], 'host': t['host'], 'online': False,
                'ping_ms': None, 'error': (err or 'unreachable')[:200],
            })
            log(f"DOWN {t['name']}: {err}")
    rep = worker_post_report(results)
    log(f"reported: {rep} in {int(time.time()-t0)}s")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        log(f'FATAL: {e}')
        sys.exit(1)
