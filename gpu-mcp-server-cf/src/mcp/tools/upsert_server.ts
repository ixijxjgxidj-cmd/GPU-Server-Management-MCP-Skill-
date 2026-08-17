import type { McpTool } from './index';
import { getServerByHost, createServer, updateServer, upsertServerNote } from '../../db/queries';

/**
 * Register-or-update a server keyed by host (IP/domain).
 * Lets an agent, after configuring a fixed server environment, push the config
 * to the MCP: if a server with the same host exists it is updated, otherwise a
 * new one is created. Host is the single dedup key.
 */
export const upsertServerTool: McpTool = {
  definition: {
    name: 'upsert_server',
    description: '按IP地址(host)登记服务器：若已存在同host的服务器则更新其信息，否则创建新服务器。host 是唯一查重依据。适合agent在配好固定服务器环境后，把最新配置(硬件、密钥、连接方式)一次性同步到MCP，无需先查ID。返回 server_id 和 created(true=新建/false=更新)。',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: '服务器IP地址或域名。唯一查重键——相同host视为同一台。' },
        name: { type: 'string', description: '服务器名称。新建时必填；更新时可选。' },
        port: { type: 'number', default: 22, description: 'SSH端口，默认22。' },
        username: { type: 'string', description: 'SSH登录用户名。新建时必填。' },
        auth_method: { type: 'string', enum: ['key', 'password'], description: '认证方式。新建时必填。' },
        key_path: { type: 'string', description: 'SSH私钥在本机的路径（可选）。' },
        key_content: { type: 'string', description: 'SSH私钥明文（key认证）。服务端原样存储，get_servers 返回时转单行base64。' },
        password: { type: 'string', description: 'SSH密码（password认证）。' },
        vendor_url: { type: 'string', description: '供应商实例链接（可选）。' },
        provider: { type: 'string', description: '运营商/供应商名称（如 "AutoDL"、"RunPod"、"Vast.ai"、"阿里云"、"腾讯云"、"恒源云"、"自建机房"）。同运营商的所有服务器将自动共享避坑经验与运维笔记。' },
        v2ray_available: { type: 'boolean', description: '是否安装V2RayN。' },
        direct_when_proxy_available: { type: 'boolean', description: '有V2RayN时是否允许直连。' },
        direct_when_no_proxy: { type: 'boolean', description: '无代理时是否允许直连物理网卡。' },
        gpu_model: { type: 'string', description: 'GPU型号。' },
        gpu_memory_gb: { type: 'number', description: '单卡显存(GB)。' },
        cpu_cores: { type: 'number', description: 'CPU核心数。' },
        ram_gb: { type: 'number', description: '内存(GB)。' },
        disk_gb: { type: 'number', description: '磁盘(GB)。' },
        default_proxy_id: { type: 'string', description: '默认代理ID（可选）。' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表。' },
        notes: { type: 'string', description: '备注。' },
        is_jump_host: { type: 'boolean', description: '是否作为跳板机 (用于SSH中转与状态探针)。' },
        gpu_count: { type: 'number', description: 'GPU卡数(静态容量)。' },
        gpu_sharing_mode: { type: 'string', enum: ['shared', 'exclusive'], description: 'GPU分配模式。shared(默认):按空闲显存共享同一张卡,适合推理/多任务共存;exclusive:整卡独占,适合训练。' },
        connection_type: { type: 'string', enum: ['standard', 'tunnel', 'cloudflare_tunnel'], description: '连接方式。standard(默认): 标准直连或SOCKS5跳板; tunnel / cloudflare_tunnel: 内网穿透隧道(支持 Cloudflare Tunnel、tmate、FRP 等临时/持久穿透)。' },
        gpu_util_pct: { type: 'number', description: 'GPU利用率0-100(负载快照)。' },
        gpu_mem_free_gb: { type: 'number', description: '空闲显存GB(负载快照)。' },
        ram_free_gb: { type: 'number', description: '空闲内存GB(负载快照)。' },
        disk_free_gb: { type: 'number', description: '空闲磁盘GB(负载快照)。' },
        running_tasks: { type: 'number', description: '当前运行任务数(负载快照)。' },
        python_version: { type: 'string', description: 'Python版本, 如 "3.10.14"' },
        torch_version: { type: 'string', description: 'PyTorch版本, 如 "2.4.0+cu121"' },
        cuda_version: { type: 'string', description: 'CUDA版本, 如 "12.1"' },
        primary_data_dir: { type: 'string', description: '主工作数据盘路径, 如 "/root/autodl-tmp"' },
        primary_env_cmd: { type: 'string', description: '推荐环境激活命令, 如 "source /root/miniconda3/bin/activate base"' },
        mount_points: { type: 'array', items: { type: 'object' }, description: '挂载点列表 JSON' },
        environments: { type: 'array', items: { type: 'object' }, description: '已安装环境列表 JSON' },
        agent: { type: 'string', description: '执行回写的agent标识(用于notes_entry.updated_by)。' },
        notes_entry: {
          type: 'object',
          description: '按topic增量写入运维知识。同topic覆盖,不同topic并存。',
          properties: {
            topic: { type: 'string', description: '如 "global_proxy"、"cuda_env"、"disk_mount"。' },
            content: { type: 'string', description: '该配置的用法/注意事项。' },
          },
          required: ['topic', 'content'],
        },
      },
      required: ['host'],
    },
  },
  execute: async (args, { db }) => {
    let host = (args.host as string).trim();
    let username = args.username as string | undefined;
    let port = args.port as number | undefined;
    let connType = (args.connection_type === 'tunnel' || args.connection_type === 'cloudflare_tunnel') ? 'tunnel' : (args.connection_type ?? 'standard');

    // Smart parsing for SSH connection links e.g. "ssh token@sfo2.tmate.io" or "token@sfo2.tmate.io:22"
    const sshCmdMatch = host.match(/^(?:ssh\s+)?(?:-p\s*(\d+)\s+)?([^\s@]+)@([^\s:]+)(?::(\d+))?$/i);
    if (sshCmdMatch) {
      const parsedPort = parseInt(sshCmdMatch[1] || sshCmdMatch[4] || '22', 10);
      username = username || sshCmdMatch[2];
      host = sshCmdMatch[3];
      port = port || parsedPort;
      connType = 'tunnel';
    } else if (host.includes('.tmate.io') || host.includes('trycloudflare.com')) {
      connType = 'tunnel';
    }

    const existing = await getServerByHost(db, host);

    // Fields that map 1:1; only include those actually provided.
    const boolToInt = (v: unknown) => (v === true ? 1 : v === false ? 0 : undefined);
    const fields: Record<string, unknown> = {
      name: args.name,
      port: port,
      username: username,
      auth_method: args.auth_method,
      key_path: args.key_path,
      key_content: args.key_content,
      password: args.password,
      vendor_url: args.vendor_url,
      provider: args.provider,
      v2ray_available: boolToInt(args.v2ray_available),
      direct_when_proxy_available: boolToInt(args.direct_when_proxy_available),
      direct_when_no_proxy: boolToInt(args.direct_when_no_proxy),
      is_jump_host: boolToInt(args.is_jump_host),
      gpu_model: args.gpu_model,
      gpu_memory_gb: args.gpu_memory_gb,
      cpu_cores: args.cpu_cores,
      ram_gb: args.ram_gb,
      disk_gb: args.disk_gb,
      default_proxy_id: args.default_proxy_id,
      notes: args.notes,
      gpu_count: args.gpu_count,
      gpu_util_pct: args.gpu_util_pct,
      gpu_mem_free_gb: args.gpu_mem_free_gb,
      ram_free_gb: args.ram_free_gb,
      disk_free_gb: args.disk_free_gb,
      running_tasks: args.running_tasks,
      gpu_sharing_mode: args.gpu_sharing_mode,
      connection_type: connType,
      tags: Array.isArray(args.tags) ? JSON.stringify(args.tags) : undefined,
      python_version: args.python_version,
      torch_version: args.torch_version,
      cuda_version: args.cuda_version,
      primary_data_dir: args.primary_data_dir,
      primary_env_cmd: args.primary_env_cmd,
      mount_points: Array.isArray(args.mount_points) ? JSON.stringify(args.mount_points) : (typeof args.mount_points === 'string' ? args.mount_points : undefined),
      environments: Array.isArray(args.environments) ? JSON.stringify(args.environments) : (typeof args.environments === 'string' ? args.environments : undefined),
    };

    const loadProvided = ['gpu_util_pct','gpu_mem_free_gb','ram_free_gb','disk_free_gb','running_tasks']
      .some(k => args[k] !== undefined);

    if (existing) {
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }
      if (loadProvided) updates.load_updated_at = new Date().toISOString();
      const success = await updateServer(db, existing.id, updates);
      // Write notes entry if provided.
      if (args.notes_entry) {
        await upsertServerNote(db, existing.id, {
          topic: (args.notes_entry as { topic: string }).topic,
          content: (args.notes_entry as { content: string }).content,
          updated_by: (args.agent as string) ?? undefined,
        });
      }
      return { content: [{ type: 'text', text: JSON.stringify({ server_id: existing.id, created: false, success }) }] };
    }

    // Creating: require the minimum fields.
    const missing = ['name', 'auth_method'].filter(k => !args[k]);
    if (!username && !args.username) missing.push('username');
    if (missing.length > 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: `新建服务器缺少必填字段: ${missing.join(', ')}` }) }],
        isError: true,
      };
    }

    const id = await createServer(db, {
      name: args.name as string,
      provider: (args.provider as string) ?? null,
      vendor_url: (args.vendor_url as string) ?? null,
      host,
      port: port ?? 22,
      username: (username || args.username) as string,
      auth_method: args.auth_method as 'key' | 'password',
      key_path: (args.key_path as string) ?? null,
      key_content: (args.key_content as string) ?? null,
      password: (args.password as string) ?? null,
      v2ray_available: boolToInt(args.v2ray_available) ?? 0,
      direct_when_proxy_available: boolToInt(args.direct_when_proxy_available) ?? 0,
      direct_when_no_proxy: boolToInt(args.direct_when_no_proxy) ?? 0,
      gpu_model: (args.gpu_model as string) ?? null,
      gpu_memory_gb: (args.gpu_memory_gb as number) ?? null,
      gpu_count: (args.gpu_count as number) ?? null,
      cpu_cores: (args.cpu_cores as number) ?? null,
      ram_gb: (args.ram_gb as number) ?? null,
      disk_gb: (args.disk_gb as number) ?? null,
      default_proxy_id: (args.default_proxy_id as string) ?? null,
      notes: (args.notes as string) ?? null,
      tags: Array.isArray(args.tags) ? JSON.stringify(args.tags) : null,
      connection_type: connType === 'tunnel' ? 'cloudflare_tunnel' : 'standard',
    });
    // Write notes entry if provided (even for new servers).
    if (args.notes_entry) {
      await upsertServerNote(db, id, {
        topic: (args.notes_entry as { topic: string }).topic,
        content: (args.notes_entry as { content: string }).content,
        updated_by: (args.agent as string) ?? undefined,
      });
    }
    return { content: [{ type: 'text', text: JSON.stringify({ server_id: id, created: true }) }] };
  },
};
