import type { McpTool } from './index';
import { deleteServerPitfall } from '../../db/queries';

export const removePitfallTool: McpTool = {
  definition: {
    name: 'remove_pitfall',
    description: '删除已过时或已在服务器上彻底解决/修复的踩坑记录。',
    inputSchema: {
      type: 'object',
      properties: {
        pitfall_id: {
          type: 'string',
          description: '要删除的踩坑记录 ID',
        },
      },
      required: ['pitfall_id'],
    },
  },
  execute: async (args, { db }) => {
    const pitfallId = args.pitfall_id as string;
    if (!pitfallId) {
      return {
        content: [{ type: 'text', text: '错误：pitfall_id 必填。' }],
        isError: true,
      };
    }

    const success = await deleteServerPitfall(db, pitfallId);
    if (!success) {
      return {
        content: [{ type: 'text', text: `删除踩坑记录失败或未找到: ${pitfallId}` }],
        isError: true,
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `✔ 踩坑记录 ${pitfallId} 已成功从集体记忆中移除`,
        }, null, 2),
      }],
    };
  },
};
