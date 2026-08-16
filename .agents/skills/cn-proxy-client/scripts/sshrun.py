#!/usr/bin/env python3
"""Run a local script (or command) on a remote box over SSH. Windows-friendly: paramiko, no sshpass/plink.

  python sshrun.py --host H --port P --user U (--key PATH | --password X) --script recon.sh
  python sshrun.py ... --cmd 'ls -l' [--login]
  python sshrun.py ... --put ./sing-box /usr/local/bin/sing-box --chmod 755

--env K=V may be repeated; exported before the script runs.
Keys are never printed. Long/loaded boxes: raise --timeout.
"""
import argparse, os, posixpath, sys, time

try:
    import paramiko
except ImportError:
    sys.exit("paramiko missing: pip install paramiko")

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def connect(a):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kw = dict(hostname=a.host, port=a.port, username=a.user, timeout=a.connect_timeout,
              banner_timeout=a.connect_timeout, auth_timeout=a.connect_timeout,
              allow_agent=False, look_for_keys=False)
    if a.key:
        path = os.path.expanduser(a.key)
        last = None
        for kc in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey):
            try:
                kw["pkey"] = kc.from_private_key_file(path)
                break
            except Exception as e:
                last = e
        else:
            sys.exit(f"cannot load key {path}: {type(last).__name__}")
    else:
        kw["password"] = a.password
    for attempt in range(a.retries + 1):
        try:
            c.connect(**kw)
            return c
        except Exception as e:
            if attempt == a.retries:
                sys.exit(f"connect failed: {type(e).__name__}: {e}")
            print(f"[retry {attempt+1} after {type(e).__name__}]", file=sys.stderr)
            time.sleep(5)


def run(c, cmd, timeout):
    try:
        _, out, err = c.exec_command(cmd, timeout=timeout)
        data = out.read() + err.read()
        rc = out.channel.recv_exit_status()
        return data.decode("utf-8", "replace").rstrip(), rc
    except Exception as e:
        return f"[{type(e).__name__}: {e}]", 255


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--host", required=True)
    p.add_argument("--port", type=int, default=22)
    p.add_argument("--user", required=True)
    p.add_argument("--key")
    p.add_argument("--password")
    p.add_argument("--script", help="local script file to upload and bash")
    p.add_argument("--cmd", help="single command to run")
    p.add_argument("--put", nargs=2, metavar=("LOCAL", "REMOTE"))
    p.add_argument("--chmod", help="octal mode for --put target, e.g. 755")
    p.add_argument("--env", action="append", default=[], metavar="K=V")
    p.add_argument("--login", action="store_true", help="wrap in bash -lc (miniconda PATH)")
    p.add_argument("--timeout", type=int, default=300)
    p.add_argument("--connect-timeout", type=int, default=45)
    p.add_argument("--retries", type=int, default=2)
    a = p.parse_args()
    if not (a.key or a.password):
        sys.exit("need --key or --password")
    if not (a.script or a.cmd or a.put):
        sys.exit("need --script, --cmd or --put")

    c = connect(a)
    rc = 0
    try:
        if a.put:
            local, remote = a.put
            s = c.open_sftp()
            try:
                s.stat(posixpath.dirname(remote) or "/")
            except IOError:
                run(c, f"mkdir -p {posixpath.dirname(remote)!r}", 60)
            size = os.path.getsize(local)
            t0 = time.time()
            s.put(local, remote)
            s.close()
            dt = max(time.time() - t0, 1e-6)
            print(f"put {size} bytes -> {remote} ({size/1048576/dt:.2f} MB/s)")
            if a.chmod:
                run(c, f"chmod {a.chmod} {remote!r}", 60)

        if a.script:
            name = os.path.basename(a.script)
            dest = f"/tmp/.sk-{name}"
            s = c.open_sftp()
            s.put(a.script, dest)
            s.close()
            env = " ".join(f"{kv.split('=', 1)[0]}={kv.split('=', 1)[1]!r}" for kv in a.env if "=" in kv)
            inner = f"{env} bash {dest}".strip()
            cmd = f"bash -lc {inner!r}" if a.login else inner
            out, rc = run(c, cmd, a.timeout)
            print(out)

        if a.cmd:
            cmd = f"bash -lc {a.cmd!r}" if a.login else a.cmd
            out, rc = run(c, cmd, a.timeout)
            print(out)
    finally:
        c.close()
    sys.exit(rc if rc in (0, 255) else 0)


if __name__ == "__main__":
    main()
