import type { DBProxy } from '../db/schema';

export interface ProxyNode {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  location?: string;
  protocol: 'socks5' | 'http';
  created_at: string;
  updated_at: string;
}

export function dbProxyToNode(db: DBProxy): ProxyNode {
  return {
    id: db.id,
    name: db.name,
    host: db.host,
    port: db.port,
    username: db.username ?? undefined,
    password: db.password ?? undefined,
    location: db.location ?? undefined,
    protocol: db.protocol,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}
