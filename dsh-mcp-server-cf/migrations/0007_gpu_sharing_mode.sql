-- GPU allocation mode per server: 'shared' (default, meter by free VRAM — inference/co-location)
-- or 'exclusive' (meter by whole free cards = gpu_count - running_tasks — training).
ALTER TABLE servers ADD COLUMN gpu_sharing_mode TEXT NOT NULL DEFAULT 'shared';
