import type { McpTool } from './index';
import { updateServerTask, recordUsage } from '../../db/queries';

export const claimServerTool: McpTool = {
  definition: {
    name: 'claim_server',
    description: '在服务器上声明占用任务(任务开始时调用)。可设置倒计时时长(duration_minutes)或不设置。记录当前占用的 agent 名称、任务描述及过期时间，防止多 Agent 算力冲突。到达时间或任务结束时需执行备份并调用 release_server。',
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: '服务器ID (来自 get_servers)' },
        agent: { type: 'string', description: '当前 Agent 标识，如 "claude-code", "codex", "antigravity"' },
        task: { type: 'string', description: '任务简要描述，如 "train-qwen-7b", "eval-benchmark"' },
        duration_minutes: { type: 'number', description: '可选：任务倒计时时长(分钟)。填入正数开启倒计时，不填或填 0 表示不限时。' },
      },
      required: ['server_id', 'agent', 'task'],
    },
  },
  execute: async (args, { db }) => {
    const serverId = args.server_id as string;
    const agent = args.agent as string;
    const task = args.task as string;
    const durationMinutes = typeof args.duration_minutes === 'number' && args.duration_minutes > 0 ? args.duration_minutes : undefined;

    const { started_at, expires_at } = await updateServerTask(db, serverId, {
      agent,
      task,
      duration_minutes: durationMinutes,
    });

    await recordUsage(db, {
      server_id: serverId,
      agent_id: agent,
      session_id: 'mcp',
      action: 'claim_task',
      details: JSON.stringify({
        task,
        duration_minutes: durationMinutes ?? null,
        started_at,
        expires_at,
      }),
    });

    let timingNotice = 'Timer: Indefinite (no auto-expiration set).';
    if (expires_at && durationMinutes) {
      timingNotice = `⏱️ Countdown Active: ${durationMinutes} minutes. Expires at: ${expires_at}.\n` +
        `When countdown expires or work finishes, initiate backup SOP (plan_server_backup) and call release_server.`;
    }

    return {
      content: [{
        type: 'text',
        text: `✔ Successfully claimed server ${serverId} for agent '${agent}' with task: "${task}".\n${timingNotice}`,
      }],
    };
  },
};
