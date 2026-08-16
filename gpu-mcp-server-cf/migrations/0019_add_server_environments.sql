-- Add storage mount points and multi-environment discovery fields
ALTER TABLE servers ADD COLUMN mount_points TEXT;     -- JSON array: [{mount, total_gb, free_gb, is_primary, is_root}]
ALTER TABLE servers ADD COLUMN primary_data_dir TEXT; -- e.g. "/root/autodl-tmp" or "/workspace" or "/data"
ALTER TABLE servers ADD COLUMN environments TEXT;     -- JSON array: [{name, type, path, python_version, torch_version, cuda_version, packages, activate_cmd, is_primary}]
ALTER TABLE servers ADD COLUMN primary_env_cmd TEXT;  -- One-line command to activate primary environment (e.g. "source /root/miniconda3/bin/activate base")
