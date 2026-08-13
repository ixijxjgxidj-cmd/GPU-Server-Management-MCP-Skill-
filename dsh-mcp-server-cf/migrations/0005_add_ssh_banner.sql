-- Add SSH banner field to servers
ALTER TABLE servers ADD COLUMN ssh_banner TEXT;
ALTER TABLE servers ADD COLUMN os_hint TEXT;
