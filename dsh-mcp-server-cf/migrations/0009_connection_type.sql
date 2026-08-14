-- Connection transport type for a server.
--   'standard'         : plain SSH to host:port (direct or via socks5 proxy) — the existing behavior.
--   'cloudflare_tunnel': SSH is reached through a Cloudflare Tunnel; `host` is the tunnel
--                        hostname and the client uses
--                        `ssh -o ProxyCommand="cloudflared access ssh --hostname %h" user@host`.
ALTER TABLE servers ADD COLUMN connection_type TEXT NOT NULL DEFAULT 'standard';
