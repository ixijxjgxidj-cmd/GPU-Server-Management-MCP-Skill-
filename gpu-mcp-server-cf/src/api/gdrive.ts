import { Hono } from 'hono';
import type { Env } from '../db/schema';
import { getSystemSetting, setSystemSetting } from '../db/queries';
import {
  parseGDriveConfig,
  listGDriveFiles,
  getGDriveFile,
  getGDriveStorageQuota,
} from '../gdrive/client';

const app = new Hono<{ Bindings: Env }>();

/**
 * Helper to resolve active Google Drive config
 */
async function resolveConfig(env: Env) {
  const dbSa = await getSystemSetting(env.DB, 'gdrive_service_account_json');
  const dbFolder = await getSystemSetting(env.DB, 'gdrive_root_folder_id');
  return parseGDriveConfig(env, dbSa, dbFolder);
}

// GET /api/gdrive/status: Get integration status and quota
app.get('/status', async (c) => {
  try {
    const config = await resolveConfig(c.env);
    if (!config) {
      return c.json({
        configured: false,
        message: 'Google Drive 未配置服务账号或凭据',
      });
    }

    const quota = await getGDriveStorageQuota(config);
    return c.json({
      configured: true,
      service_account_email: config.serviceAccount?.client_email,
      root_folder_id: config.rootFolderId || null,
      quota,
    });
  } catch (e: any) {
    return c.json({
      configured: true,
      error: e.message || '获取 Google Drive 状态失败',
    }, 500);
  }
});

// GET /api/gdrive/files: List files/folders
app.get('/files', async (c) => {
  try {
    const config = await resolveConfig(c.env);
    if (!config) {
      return c.json({
        error: 'Google Drive 未配置。请在系统设置中提供 Service Account JSON。',
        configured: false,
      }, 400);
    }

    const folderId = c.req.query('folder_id') || undefined;
    const query = c.req.query('query') || undefined;
    const pageSize = c.req.query('page_size') ? parseInt(c.req.query('page_size')!, 10) : 50;
    const pageToken = c.req.query('page_token') || undefined;
    const orderBy = c.req.query('order_by') || undefined;

    const result = await listGDriveFiles(config, {
      folderId,
      query,
      pageSize,
      pageToken,
      orderBy,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (e: any) {
    return c.json({
      success: false,
      error: e.message || '获取文件列表失败',
    }, 500);
  }
});

// GET /api/gdrive/file/:id: Get file details
app.get('/file/:id', async (c) => {
  try {
    const config = await resolveConfig(c.env);
    if (!config) {
      return c.json({ error: 'Google Drive 未配置' }, 400);
    }

    const fileId = c.req.param('id');
    const file = await getGDriveFile(config, fileId);
    return c.json({
      success: true,
      file,
    });
  } catch (e: any) {
    return c.json({
      success: false,
      error: e.message || '获取文件元数据失败',
    }, 500);
  }
});

// POST /api/gdrive/config: Save Service Account config into D1
app.post('/config', async (c) => {
  try {
    const body = await c.req.json<{ service_account_json?: string; root_folder_id?: string }>();
    if (!body.service_account_json) {
      return c.json({ error: 'service_account_json 为必填项' }, 400);
    }

    // Validate JSON structure
    const parsed = JSON.parse(body.service_account_json);
    if (!parsed.client_email || !parsed.private_key) {
      return c.json({ error: '无效的 Google Service Account JSON，缺少 client_email 或 private_key' }, 400);
    }

    await setSystemSetting(c.env.DB, 'gdrive_service_account_json', body.service_account_json.trim());
    if (body.root_folder_id !== undefined) {
      await setSystemSetting(c.env.DB, 'gdrive_root_folder_id', body.root_folder_id.trim());
    }

    return c.json({
      success: true,
      message: 'Google Drive 配置已保存',
    });
  } catch (e: any) {
    return c.json({
      success: false,
      error: e.message || '保存配置失败',
    }, 400);
  }
});

export default app;
