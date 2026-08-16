import type { McpTool } from './index';
import { getSystemSetting } from '../../db/queries';
import { parseGDriveConfig, listGDriveFiles, getGDriveStorageQuota } from '../../gdrive/client';

export const listGDriveFilesTool: McpTool = {
  definition: {
    name: 'list_gdrive_files',
    description: '实时查询与检索 Google Drive 云端归档数据（实验备份产出、检查点权重 best.pt、数据集与配置文件）。支持关键词过滤、按文件夹层级下钻及存储配额查询。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '可选：搜索关键词（如 "ceed", "best.pt", "v100", "output"）。支持文件名或内容模糊搜索。',
        },
        folder_id: {
          type: 'string',
          description: '可选：目标文件夹 ID。不填时默认查询根备份目录或全盘根目录。',
        },
        page_size: {
          type: 'number',
          description: '可选：返回文件数量上限（默认 30，最大 100）。',
        },
        include_quota: {
          type: 'boolean',
          description: '可选：是否在返回结果中包含当前 Google Drive 存储空间配额（已用/总量），默认 false。',
        },
      },
    },
  },
  execute: async (args, { env, db }) => {
    const dbSa = await getSystemSetting(db, 'gdrive_service_account_json');
    const dbFolder = await getSystemSetting(db, 'gdrive_root_folder_id');
    const config = parseGDriveConfig(env, dbSa, dbFolder);

    if (!config) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Google Drive 尚未配置服务账号凭据。\n请在系统控制台「云盘存储」中配置 Service Account JSON，或在环境变量设置 `GDRIVE_SERVICE_ACCOUNT_JSON`。',
          },
        ],
        isError: true,
      };
    }

    try {
      const query = typeof args.query === 'string' ? args.query.trim() : undefined;
      const folderId = typeof args.folder_id === 'string' ? args.folder_id.trim() : undefined;
      const pageSize = typeof args.page_size === 'number' ? args.page_size : 30;
      const includeQuota = Boolean(args.include_quota);

      const listResult = await listGDriveFiles(config, {
        query,
        folderId,
        pageSize,
      });

      let quotaInfo: any = null;
      if (includeQuota) {
        try {
          quotaInfo = await getGDriveStorageQuota(config);
        } catch (qe) {
          // ignore quota failure
        }
      }

      const filesFormatted = listResult.files.map(f => {
        const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
        const sizeBytes = f.size ? parseInt(f.size, 10) : null;
        const sizeFormatted = isFolder
          ? '文件夹'
          : sizeBytes !== null
          ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
          : '未知大小';

        return {
          id: f.id,
          name: f.name,
          type: isFolder ? 'folder' : 'file',
          size: sizeFormatted,
          size_bytes: sizeBytes,
          modified_time: f.modifiedTime,
          web_view_link: f.webViewLink,
          md5_checksum: f.md5Checksum,
        };
      });

      const responsePayload: Record<string, unknown> = {
        count: filesFormatted.length,
        query: query || null,
        folder_id: folderId || config.rootFolderId || 'root',
        files: filesFormatted,
      };

      if (quotaInfo) {
        responsePayload.quota = {
          usage_gb: quotaInfo.usage ? (parseInt(quotaInfo.usage, 10) / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : null,
          limit_gb: quotaInfo.limit ? (parseInt(quotaInfo.limit, 10) / (1024 * 1024 * 1024)).toFixed(2) + ' GB' : '无限',
          account_email: quotaInfo.userEmail,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responsePayload, null, 2),
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 查询 Google Drive 失败: ${e.message || String(e)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
