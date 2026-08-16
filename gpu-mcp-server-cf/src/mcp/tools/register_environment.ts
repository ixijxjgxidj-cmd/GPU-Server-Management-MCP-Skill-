import type { McpTool } from './index';

export const registerEnvironmentTool: McpTool = {
  definition: {
    name: 'register_environment',
    description: '在指定GPU服务器上注册或更新一个已配置好的 Python / Conda / Venv 虚拟环境。将环境路径、PyTorch/CUDA版本、关键包清单和激活命令永久固化进集群集体记忆。后续无论经过多少次长上下文压缩或跨 Agent 会话，均可直接读取复用，彻底避免重复安装。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID' },
        name: { type: 'string', description: '环境名称, 如 "py310_torch24", "base", "vllm"' },
        path: { type: 'string', description: '环境 Python 解释器绝对路径, 如 "/root/autodl-tmp/conda/envs/py310/bin/python"' },
        type: { type: 'string', enum: ['conda', 'venv', 'system', 'docker'], description: '环境类型 (默认 conda)' },
        python_version: { type: 'string', description: 'Python版本, 如 "3.10.14"' },
        torch_version: { type: 'string', description: 'PyTorch版本, 如 "2.4.0+cu121"' },
        cuda_version: { type: 'string', description: 'CUDA版本, 如 "12.1"' },
        packages: { type: 'array', items: { type: 'string' }, description: '已安装的关键AI依赖包列表, 如 ["transformers", "flash_attn", "deepspeed"]' },
        activate_cmd: { type: 'string', description: '环境激活命令, 如 "source /root/autodl-tmp/conda/bin/activate py310" 或 "conda activate py310"' },
        is_primary: { type: 'boolean', description: '是否作为该服务器的首选推荐默认主环境 (默认 true)' },
      },
      required: ['server_id', 'name', 'path'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const name = args.name as string;
    const path = args.path as string;
    const envType = (args.type as string) || 'conda';
    const pyVer = (args.python_version as string) || null;
    const torchVer = (args.torch_version as string) || null;
    const cudaVer = (args.cuda_version as string) || null;
    const packages = Array.isArray(args.packages) ? (args.packages as string[]) : [];
    const activateCmd = (args.activate_cmd as string) || (envType === 'conda' ? `conda activate ${name}` : `source ${path.replace(/\/bin\/python.*$/, '')}/bin/activate`);
    const isPrimary = args.is_primary !== false; // Default true

    const server = await db.prepare('SELECT id, environments, primary_env_cmd, python_version, torch_version, cuda_version FROM servers WHERE id = ?').bind(serverId).first<{
      id: string;
      environments: string | null;
      primary_env_cmd: string | null;
      python_version: string | null;
      torch_version: string | null;
      cuda_version: string | null;
    }>();

    if (!server) {
      return { content: [{ type: 'text', text: `Error: Server ${serverId} not found.` }], isError: true };
    }

    interface EnvItem {
      name: string;
      type: string;
      path: string;
      python_version?: string | null;
      torch_version?: string | null;
      cuda_version?: string | null;
      packages?: string[];
      activate_cmd?: string;
      is_primary?: boolean;
    }

    let envs: EnvItem[] = [];
    if (server.environments) {
      try {
        envs = JSON.parse(server.environments);
      } catch (e) {
        // ignore parse error
      }
    }

    if (isPrimary) {
      for (const e of envs) {
        e.is_primary = false;
      }
    }

    const newItem: EnvItem = {
      name,
      type: envType,
      path,
      python_version: pyVer,
      torch_version: torchVer,
      cuda_version: cudaVer,
      packages,
      activate_cmd: activateCmd,
      is_primary: isPrimary,
    };

    const existingIndex = envs.findIndex(e => e.name === name || e.path === path);
    if (existingIndex >= 0) {
      envs[existingIndex] = newItem;
    } else {
      envs.push(newItem);
    }

    // Prepare update fields
    const updates: string[] = ['environments = ?'];
    const params: unknown[] = [JSON.stringify(envs)];

    if (isPrimary) {
      updates.push('primary_env_cmd = ?');
      params.push(activateCmd);
      if (pyVer) { updates.push('python_version = ?'); params.push(pyVer); }
      if (torchVer) { updates.push('torch_version = ?'); params.push(torchVer); }
      if (cudaVer) { updates.push('cuda_version = ?'); params.push(cudaVer); }
    }

    params.push(serverId);
    await db.prepare(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `已成功在服务器 ${serverId} 注册环境 '${name}'！已沉淀进集体记忆，后续 Agent 可直接复用。`,
          environment: newItem,
          ready_to_use_activate_cmd: activateCmd,
          is_primary: isPrimary,
        }, null, 2),
      }],
    };
  },
};
