import type { McpTool } from './index';
import { queryServersByAbility } from '../../db/queries';

const PROBE_COMMANDS = {
  gpu_util_pct: "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | awk '{s+=$1;n++} END{print (n?int(s/n):0)}'",
  gpu_mem_free_gb: "nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | awk '{s+=$1} END{print int(s/1024)}'",
  ram_free_gb: "free -g 2>/dev/null | awk '/^Mem:/{print $7}'",
  disk_free_gb: 'df -BG / 2>/dev/null | awk \'NR==2{gsub(/G/,"",$4); print $4}\'',
  running_tasks: "nvidia-smi --query-compute-apps=pid --format=csv,noheader 2>/dev/null | wc -l",
  mounts: 'df -BG -x tmpfs -x devtmpfs -x overlay -x squashfs -x iso9660 2>/dev/null | awk \'NR>1 {gsub(/G/,"",$2); gsub(/G/,"",$4); printf "%s:%s:%s,", $6, $2, $4}\' | sed \'s/,$//\'',
  env_matrix: 'python3 -c "import base64; exec(base64.b64decode(\'aW1wb3J0IG9zLCBzeXMsIGdsb2IsIHN1YnByb2Nlc3MKc2VlbiA9IHNldCgpCmNhbmQgPSBbcCBmb3IgcCBpbiBbJy91c3IvYmluL3B5dGhvbjMnLCAnL3Vzci9iaW4vcHl0aG9uJywgc3lzLmV4ZWN1dGFibGVdIGlmIG9zLnBhdGguZXhpc3RzKHApXQpyb290cyA9IFsnL3Jvb3QnLCAnL29wdCcsICcvZGF0YScsICcvd29ya3NwYWNlJywgJy9yb290L2F1dG9kbC10bXAnLCAnL2h5LXRtcCcsICcvbW50J10KZm9yIHIgaW4gcm9vdHM6CiAgICBmb3IgcGF0IGluIFsKICAgICAgICBmJ3tyfS9taW5pY29uZGEzL2Jpbi9weXRob24nLAogICAgICAgIGYne3J9L2FuYWNvbmRhMy9iaW4vcHl0aG9uJywKICAgICAgICBmJ3tyfS9jb25kYS9iaW4vcHl0aG9uJywKICAgICAgICBmJ3tyfS9taW5pY29uZGEzL2VudnMvKi9iaW4vcHl0aG9uJywKICAgICAgICBmJ3tyfS9hbmFjb25kYTMvZW52cy8qL2Jpbi9weXRob24nLAogICAgICAgIGYne3J9L2NvbmRhL2VudnMvKi9iaW4vcHl0aG9uJywKICAgICAgICBmJ3tyfS9lbnZzLyovYmluL3B5dGhvbicsCiAgICAgICAgZid7cn0vLmNvbmRhL2VudnMvKi9iaW4vcHl0aG9uJywKICAgICAgICBmJ3tyfS8qLy52ZW52L2Jpbi9weXRob24nLAogICAgICAgIGYne3J9LyovdmVudi9iaW4vcHl0aG9uJwogICAgXToKICAgICAgICBjYW5kLmV4dGVuZChnbG9iLmdsb2IocGF0KSkKCnByb2JlX3B5ID0gKAogICAgImltcG9ydCBzeXNcbiIKICAgICJ2ID0gc3lzLnZlcnNpb24uc3BsaXQoKVswXVxuIgogICAgInQgPSAnJ1xuIgogICAgImMgPSAnJ1xuIgogICAgInRyeTpcbiIKICAgICIgICAgaW1wb3J0IHRvcmNoXG4iCiAgICAiICAgIHQgPSBzdHIodG9yY2guX192ZXJzaW9uX18pXG4iCiAgICAiICAgIGMgPSBzdHIoZ2V0YXR0cih0b3JjaC52ZXJzaW9uLCAnY3VkYScsICcnKSBvciAnJylcbiIKICAgICJleGNlcHQgRXhjZXB0aW9uOlxuIgogICAgIiAgICBwYXNzXG4iCiAgICAicGtncyA9IFtdXG4iCiAgICAiZm9yIGsgaW4gWyd0cmFuc2Zvcm1lcnMnLCAndmxsbScsICdmbGFzaF9hdHRuJywgJ2RlZXBzcGVlZCcsICdhY2NlbGVyYXRlJywgJ3RyaXRvbicsICd0b3JjaHZpc2lvbiddOlxuIgogICAgIiAgICB0cnk6XG4iCiAgICAiICAgICAgICBfX2ltcG9ydF9fKGspXG4iCiAgICAiICAgICAgICBwa2dzLmFwcGVuZChrKVxuIgogICAgIiAgICBleGNlcHQgRXhjZXB0aW9uOlxuIgogICAgIiAgICAgICAgcGFzc1xuIgogICAgInByaW50KHYgKyAnfCcgKyB0ICsgJ3wnICsgYyArICd8JyArICcsJy5qb2luKHBrZ3MpKVxuIgopCgpmb3IgcHkgaW4gY2FuZDoKICAgIHJlYWwgPSBvcy5wYXRoLnJlYWxwYXRoKHB5KQogICAgaWYgcmVhbCBpbiBzZWVuIG9yIG5vdCBvcy5wYXRoLmlzZmlsZShyZWFsKToKICAgICAgICBjb250aW51ZQogICAgc2Vlbi5hZGQocmVhbCkKICAgIHBhcnRzID0gcmVhbC5yZXBsYWNlKCdcXCcsICcvJykuc3BsaXQoJy8nKQogICAgZW52X25hbWUgPSAnc3lzdGVtJwogICAgZW52X3R5cGUgPSAnc3lzdGVtJwogICAgYWN0X2NtZCA9ICcnCiAgICBpZiAnZW52cycgaW4gcGFydHM6CiAgICAgICAgaWR4ID0gcGFydHMuaW5kZXgoJ2VudnMnKQogICAgICAgIGlmIGlkeCArIDEgPCBsZW4ocGFydHMpOgogICAgICAgICAgICBlbnZfbmFtZSA9IHBhcnRzW2lkeCArIDFdCiAgICAgICAgICAgIGVudl90eXBlID0gJ2NvbmRhJwogICAgICAgICAgICBjb25kYV9iYXNlID0gJy8nLmpvaW4ocGFydHNbOmlkeF0pCiAgICAgICAgICAgIGFjdF9jbWQgPSBmJ3NvdXJjZSB7Y29uZGFfYmFzZX0vYmluL2FjdGl2YXRlIHtlbnZfbmFtZX0nCiAgICBlbGlmIGFueSgnY29uZGEnIGluIHgubG93ZXIoKSBmb3IgeCBpbiBwYXJ0cyk6CiAgICAgICAgZW52X25hbWUgPSAnYmFzZScKICAgICAgICBlbnZfdHlwZSA9ICdjb25kYScKICAgICAgICBjX2lkeHMgPSBbaSBmb3IgaSwgeCBpbiBlbnVtZXJhdGUocGFydHMpIGlmICdjb25kYScgaW4geC5sb3dlcigpXQogICAgICAgIGNvbmRhX2Jhc2UgPSAnLycuam9pbihwYXJ0c1s6bWF4KGNfaWR4cykrMV0pCiAgICAgICAgYWN0X2NtZCA9IGYnc291cmNlIHtjb25kYV9iYXNlfS9iaW4vYWN0aXZhdGUgYmFzZScKICAgIGVsaWYgJy52ZW52JyBpbiBwYXJ0cyBvciAndmVudicgaW4gcGFydHM6CiAgICAgICAgZW52X25hbWUgPSBwYXJ0c1stM10gaWYgbGVuKHBhcnRzKSA+PSAzIGVsc2UgJ3ZlbnYnCiAgICAgICAgZW52X3R5cGUgPSAndmVudicKICAgICAgICBhY3RfY21kID0gZidzb3VyY2Uge29zLnBhdGguZGlybmFtZShvcy5wYXRoLmRpcm5hbWUocmVhbCkpfS9iaW4vYWN0aXZhdGUnCgogICAgdHJ5OgogICAgICAgIHJlcyA9IHN1YnByb2Nlc3MucnVuKFtyZWFsLCAnLWMnLCBwcm9iZV9weV0sIGNhcHR1cmVfb3V0cHV0PVRydWUsIHRleHQ9VHJ1ZSwgdGltZW91dD01KQogICAgICAgIGlmIHJlcy5yZXR1cm5jb2RlID09IDAgYW5kICd8JyBpbiByZXMuc3Rkb3V0OgogICAgICAgICAgICBwcmludChmIkVOVl9JVEVNPXtlbnZfbmFtZX18e2Vudl90eXBlfXx7cmVhbH18e3Jlcy5zdGRvdXQuc3RyaXAoKX18e2FjdF9jbWR9IikKICAgIGV4Y2VwdCBFeGNlcHRpb246CiAgICAgICAgcGFzcw==\').decode())" 2>/dev/null',
};

export const refreshLoadTool: McpTool = {
  definition: {
    name: 'refresh_load',
    description: '获取各服务器的负载探测命令包,用于agent并发SSH执行后用 upsert_server 回写实时负载(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),实现负载均衡的B(实时)路径。不传参则针对所有在线服务器。',
    inputSchema: {
      type: 'object',
      properties: {
        server_ids: { type: 'array', items: { type: 'string' }, description: '只探测这些服务器(可选)。' },
        gpu_model: { type: 'string', description: '按GPU型号过滤(可选)。' },
      },
    },
  },
  execute: async (args, { db }) => {
    const serverIds = args.server_ids as string[] | undefined;
    const gpuModel = args.gpu_model as string | undefined;
    let servers = await queryServersByAbility(db, { gpu_model: gpuModel, status_online: true });
    if (serverIds && serverIds.length > 0) {
      const set = new Set(serverIds);
      servers = servers.filter(s => set.has(s.id));
    }
    const targets = servers.map(s => ({
      server_id: s.id,
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username,
      auth_method: s.auth_method,
      key_path: s.key_path,
      key_content_b64: s.key_content ? btoa(s.key_content) : null,
      password: s.password,
      probe_commands: PROBE_COMMANDS,
    }));
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          how_to: '对每台并发SSH执行 probe_commands,把结果用 upsert_server 回写(gpu_util_pct/gpu_mem_free_gb/ram_free_gb/disk_free_gb/running_tasks),然后 get_servers 或 plan_task_allocation 读最新快照。密钥用 key_content_b64 解码: echo <b64> | base64 -d > /tmp/dsh_<id> && chmod 600。',
          count: targets.length,
          targets,
        }),
      }],
    };
  },
};
