-- Software training environment + live top-CPU snapshot, surfaced by get_servers.
-- Versions are semi-static (change on reinstall); top_cpu_tasks is a live snapshot
-- refreshed by the probe agent alongside gpu/ram/disk load.
ALTER TABLE servers ADD COLUMN python_version TEXT;
ALTER TABLE servers ADD COLUMN torch_version TEXT;
ALTER TABLE servers ADD COLUMN cuda_version TEXT;
ALTER TABLE servers ADD COLUMN top_cpu_tasks TEXT;  -- JSON array: [{cpu, mem, cmd}]
