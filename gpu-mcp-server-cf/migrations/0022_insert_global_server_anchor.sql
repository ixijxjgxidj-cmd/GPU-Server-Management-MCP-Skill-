-- Migration 0022: Insert global anchor server row for permanent knowledge zone references
INSERT OR IGNORE INTO servers (
  id, name, host, port, username, auth_method, enabled, provider, notes, created_at, updated_at
) VALUES (
  'global',
  '🌐 出海代理与全局避坑专区',
  'global.memory',
  22,
  'system',
  'key',
  0,
  'Global',
  '永久全局知识库与出海代理避坑专区（不随任何物理服务器删除而消失）',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);

INSERT OR IGNORE INTO servers (
  id, name, host, port, username, auth_method, enabled, provider, notes, created_at, updated_at
) VALUES (
  'proxy',
  '🌐 出海代理配置专区',
  'proxy.memory',
  22,
  'system',
  'key',
  0,
  'ProxyZone',
  '永久出海代理避坑专区（不随任何物理服务器删除而消失）',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
