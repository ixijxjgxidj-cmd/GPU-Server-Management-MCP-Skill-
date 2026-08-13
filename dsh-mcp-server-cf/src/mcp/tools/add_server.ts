import type { McpTool } from './index';
import { createServer } from '../../db/queries';

export const addServerTool: McpTool = {
  definition: {
    name: 'add_server',
    description: '向集群中添加一台新的GPU服务器。使用前请确认用户提供了服务器名称、IP地址、SSH用户名和认证方式。返回新服务器的UUID。注意：添加后服务器状态默认为"离线"，需要调用 probe_server 或 verify_server_connectivity 进行连通性探测。连接方式(V2RayN/直连)通过 v2ray_available、direct_when_proxy_available、direct_when_no_proxy 三个布尔参数组合控制。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '服务器显示名称。例如 "A100-Node-1"、"T4-Training-2"。' },
        host: { type: 'string', description: '服务器IP地址或域名。例如 "192.168.1.100" 或 "gpu-server.example.com"。' },
        port: { type: 'number', default: 22, description: 'SSH端口号。默认为22。' },
        vendor_url: { type: 'string', description: '服务器供应商URL（可选）。例如 Autodl、Graviti 等平台的实例链接。' },
        username: { type: 'string', description: 'SSH登录用户名。例如 "root" 或 "ubuntu"。' },
        auth_method: { type: 'string', enum: ['key', 'password'], description: '认证方式："key"为SSH密钥，"password"为密码。' },
        key_path: { type: 'string', description: 'SSH私钥路径（auth_method为key时使用）。例如 "/root/.ssh/id_rsa"。' },
        key_content: { type: 'string', description: 'SSH私钥内容（auth_method为key时使用，直接传入密钥文本）。' },
        password: { type: 'string', description: 'SSH密码（auth_method为password时使用）。' },
        v2ray_available: { type: 'boolean', default: false, description: '服务器上是否安装了V2RayN代理。如果为true，说明服务器自身有代理能力。' },
        direct_when_proxy_available: { type: 'boolean', default: false, description: '当有V2RayN可用时，是否允许直连（不经过代理池）。需要 v2ray_available=true 才有意义。' },
        direct_when_no_proxy: { type: 'boolean', default: false, description: '当没有V2RayN且没有代理池节点时，是否允许直接SSH连接。适用于国内可直接访问的服务器。' },
        gpu_model: { type: 'string', description: 'GPU型号。例如 "NVIDIA A100"、"RTX 4090"、"Tesla T4"。' },
        gpu_memory_gb: { type: 'number', description: '单卡显存大小（GB）。例如 80、24、16。' },
        cpu_cores: { type: 'number', description: 'CPU核心数。例如 32、64。' },
        ram_gb: { type: 'number', description: '内存大小（GB）。例如 256、512。' },
        disk_gb: { type: 'number', description: '磁盘大小（GB）。例如 1024、2048。' },
        default_proxy_id: { type: 'string', description: '默认代理ID（可选）。从 list_proxies 返回的 id 获取，设置后该服务器优先使用此代理。' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表。用于分类和过滤，例如 ["training", "production"] 或 ["inference", "dev"]。' },
        notes: { type: 'string', description: '备注信息。自由文本，可用于记录服务器的用途、注意事项等。' },
      },
      required: ['name', 'host', 'username', 'auth_method'],
    },
  },
  execute: async (args, { db }) => {
    const id = await createServer(db, {
      name: args.name as string,
      vendor_url: (args.vendor_url as string) ?? null,
      host: args.host as string,
      port: (args.port as number) ?? 22,
      username: args.username as string,
      auth_method: (args.auth_method as 'key' | 'password'),
      key_path: (args.key_path as string) ?? null,
      key_content: (args.key_content as string) ?? null,
      password: (args.password as string) ?? null,
      v2ray_available: (args.v2ray_available as boolean) ? 1 : 0,
      direct_when_proxy_available: (args.direct_when_proxy_available as boolean) ? 1 : 0,
      direct_when_no_proxy: (args.direct_when_no_proxy as boolean) ? 1 : 0,
      gpu_model: (args.gpu_model as string) ?? null,
      gpu_memory_gb: (args.gpu_memory_gb as number) ?? null,
      cpu_cores: (args.cpu_cores as number) ?? null,
      ram_gb: (args.ram_gb as number) ?? null,
      disk_gb: (args.disk_gb as number) ?? null,
      default_proxy_id: (args.default_proxy_id as string) ?? null,
      notes: (args.notes as string) ?? null,
      tags: args.tags ? JSON.stringify(args.tags) : null,
    });
    return { content: [{ type: 'text', text: JSON.stringify({ id }) }] };
  },
};
