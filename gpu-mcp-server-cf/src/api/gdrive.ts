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

// GET /api/gdrive/setup.sh: Download one-click bash setup script populated with credentials
app.get('/setup.sh', async (c) => {
  const config = await resolveConfig(c.env);
  if (!config || !config.serviceAccount) {
    return c.text('#!/bin/bash\necho "❌ 错误: Google Drive 尚未配置 Service Account 凭据"\nexit 1\n', 400);
  }

  const saJson = JSON.stringify(config.serviceAccount, null, 2);
  const rootFolderId = config.rootFolderId || '1P255fLRCi6a44v0Ygrv1RvMyqxKh0b52';
  const queryProxy = c.req.query('proxy') || '';

  const script = `#!/bin/bash
set -e
echo "🚀 开始在当前服务器自动配置 Google Drive (rclone) 环境..."

# 0. 代理检测与生效 (sing-box / local proxy)
PARAM_PROXY="${queryProxy}"
LOCAL_PROXY=""

if [ -n "$PARAM_PROXY" ]; then
    LOCAL_PROXY="$PARAM_PROXY"
elif [ -n "$http_proxy" ]; then
    LOCAL_PROXY="$http_proxy"
elif [ -f /etc/profile.d/00-proxy.sh ]; then
    source /etc/profile.d/00-proxy.sh 2>/dev/null || true
    LOCAL_PROXY="\${http_proxy:-http://127.0.0.1:10809}"
elif command -v ss &>/dev/null && ss -tln | grep -qE ':10809 |:10808 '; then
    LOCAL_PROXY="http://127.0.0.1:10809"
elif command -v netstat &>/dev/null && netstat -tln | grep -qE ':10809 |:10808 '; then
    LOCAL_PROXY="http://127.0.0.1:10809"
elif command -v ss &>/dev/null && ss -tln | grep -q ':7890 '; then
    LOCAL_PROXY="http://127.0.0.1:7890"
fi

if [ -n "$LOCAL_PROXY" ]; then
    echo "🌐 检测到本地出海代理: $LOCAL_PROXY (Google Drive 将自动走代理通道)"
    export http_proxy="$LOCAL_PROXY"
    export https_proxy="$LOCAL_PROXY"
    export ALL_PROXY="$LOCAL_PROXY"
else
    echo "ℹ️ 未检测到本地代理，正在测试 Google API 直连连通性..."
    if ! curl -s --max-time 4 https://oauth2.googleapis.com >/dev/null 2>&1; then
        echo ""
        echo "❌ 错误: 该节点位于中国大陆且未部署本地出海代理 (如 sing-box / 127.0.0.1:10809)，无法连接 Google API！"
        echo "⚠️ Google Drive 已禁用。请先在该服务器部署出海代理（如 sing-box）后方可配置 Google Drive。"
        exit 1
    fi
fi

mkdir -p ~/.config/rclone /etc/rclone /etc/gdrive

cat << 'JSON_EOF' > /etc/gdrive/service_account.json
${saJson}
JSON_EOF
chmod 600 /etc/gdrive/service_account.json

# 写入 rclone 配置
if [ -n "$LOCAL_PROXY" ]; then
cat << CONF_EOF > ~/.config/rclone/rclone.conf
[gdrive]
type = drive
scope = drive
service_account_file = /etc/gdrive/service_account.json
root_folder_id = ${rootFolderId}
proxy = $LOCAL_PROXY
CONF_EOF
else
cat << CONF_EOF > ~/.config/rclone/rclone.conf
[gdrive]
type = drive
scope = drive
service_account_file = /etc/gdrive/service_account.json
root_folder_id = ${rootFolderId}
CONF_EOF
fi
cp ~/.config/rclone/rclone.conf /etc/rclone/rclone.conf 2>/dev/null || true

# 安装 rclone (若缺失)
if ! command -v rclone &> /dev/null; then
    echo "📦 正在安装 rclone..."
    if command -v apt-get &> /dev/null; then
        apt-get update -y && apt-get install -y rclone || curl -fsSL https://rclone.org/install.sh | bash
    elif command -v yum &> /dev/null; then
        yum install -y rclone || curl -fsSL https://rclone.org/install.sh | bash
    else
        curl -fsSL https://rclone.org/install.sh | bash
    fi
fi

# 写入便捷辅助指令
cat << 'BIN_EOF' > /usr/local/bin/gdrive-push
#!/bin/bash
if [ -f /etc/profile.d/00-proxy.sh ]; then
    source /etc/profile.d/00-proxy.sh 2>/dev/null || true
fi
if [ -z "$1" ]; then
    echo "用法: gdrive-push <本地文件或文件夹路径> [云端子目录名]"
    echo "示例: gdrive-push ./outputs/best.pt"
    echo "示例: gdrive-push ./checkpoints/ ceed_run"
    exit 1
fi
LOCAL="$1"
REMOTE="\${2:-}"
if [ -d "$LOCAL" ]; then
    echo "🚀 正在同步文件夹: $LOCAL -> gdrive:$REMOTE"
    rclone copy -P --transfers 8 --checkers 16 "$LOCAL" "gdrive:$REMOTE"
else
    echo "🚀 正在上传文件: $LOCAL -> gdrive:$REMOTE"
    rclone copy -P "$LOCAL" "gdrive:$REMOTE"
fi
echo "✅ 上传完成！可在控制台云盘大盘实时查看。"
BIN_EOF

cat << 'BIN_EOF' > /usr/local/bin/gdrive-pull
#!/bin/bash
if [ -f /etc/profile.d/00-proxy.sh ]; then
    source /etc/profile.d/00-proxy.sh 2>/dev/null || true
fi
if [ -z "$1" ]; then
    echo "用法: gdrive-pull <云端文件或文件夹路径> [本地存放目录]"
    echo "示例: gdrive-pull best.pt ./"
    exit 1
fi
REMOTE="$1"
LOCAL="\${2:-.}"
echo "📥 正在从 Google Drive 下载: gdrive:$REMOTE -> $LOCAL"
rclone copy -P --transfers 8 "gdrive:$REMOTE" "$LOCAL"
echo "✅ 下载完成！"
BIN_EOF

cat << 'BIN_EOF' > /usr/local/bin/gdrive-ls
#!/bin/bash
if [ -f /etc/profile.d/00-proxy.sh ]; then
    source /etc/profile.d/00-proxy.sh 2>/dev/null || true
fi
rclone lsf "gdrive:\${1:-}"
BIN_EOF

chmod +x /usr/local/bin/gdrive-push /usr/local/bin/gdrive-pull /usr/local/bin/gdrive-ls 2>/dev/null || true

echo ""
echo "🎉 Google Drive (rclone) 一键配置完成！"
echo "👉 测试连接:"
rclone lsd gdrive: 2>/dev/null || echo "已就绪"
echo ""
echo "💡 常用命令已生效:"
echo "  - gdrive-ls                 : 查看云盘文件列表"
echo "  - gdrive-push <本地> [子目录] : 上传模型/权重/日志至云盘"
echo "  - gdrive-pull <远端> [本地]   : 从云盘拉取模型/权重"
`;

  c.header('Content-Type', 'text/x-shellscript; charset=utf-8');
  return c.text(script);
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
