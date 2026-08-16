import { Hono } from 'hono';
import type { Env } from '../db/schema';

const app = new Hono<{ Bindings: Env }>();

interface ExtractedServerInfo {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  auth_method?: 'key' | 'password';
  key_content?: string;
  password?: string;
  gpu_model?: string;
  gpu_memory_gb?: number;
  cpu_cores?: number;
  ram_gb?: number;
  disk_gb?: number;
  provider?: string;
  vendor_url?: string;
  tags?: string[];
  notes?: string;
}

export type { ExtractedServerInfo };

function resolveAiCredentials(c: any, body?: any) {
  const customKey = (body?.api_key || c.req.header('x-nim-api-key') || c.req.header('x-ai-api-key') || '').trim();
  const customUrl = (body?.api_url || c.req.header('x-nim-api-url') || c.req.header('x-ai-api-url') || '').trim();
  const customModel = (body?.model_name || c.req.header('x-nim-model-name') || c.req.header('x-ai-model-name') || '').trim();

  const apiKey = customKey || c.env.AI_MODEL_API_KEY;
  const apiUrl = customUrl || c.env.AI_MODEL_API_URL || 'https://integrate.api.nvidia.com';
  const modelName = customModel || c.env.AI_MODEL_NAME || 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1';

  return { apiKey, apiUrl, modelName, isCustom: Boolean(customKey) };
}

/**
 * GET /api/ai/config-status
 * Returns current server-side AI configuration state.
 */
app.get('/config-status', (c) => {
  const envKey = (c.env.AI_MODEL_API_KEY || '').trim();
  const envUrl = c.env.AI_MODEL_API_URL || 'https://integrate.api.nvidia.com';
  const envModel = c.env.AI_MODEL_NAME || 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1';

  return c.json({
    has_env_key: Boolean(envKey.length > 0),
    masked_key: envKey ? `${envKey.slice(0, 7)}...${envKey.slice(-4)}` : null,
    api_url: envUrl,
    model_name: envModel,
  });
});

/**
 * POST /api/ai/test-connection
 * Tests NVIDIA NIM or custom AI endpoint connectivity.
 */
app.post('/test-connection', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { apiKey, apiUrl, modelName, isCustom } = resolveAiCredentials(c, body);

  if (!apiKey) {
    return c.json({
      success: false,
      error: '未配置 NIM API Key。请在控制面板输入或在 Cloudflare Worker 中设置 AI_MODEL_API_KEY',
    }, 400);
  }

  const startTime = Date.now();
  try {
    const baseUrl = apiUrl.replace(/\/$/, '');
    const apiPath = baseUrl.includes('/v1') ? '/chat/completions' : '/v1/chat/completions';
    const fullUrl = baseUrl + apiPath;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'dsh-mcp-server/1.0',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: 'Ping. Output OK' }],
        max_tokens: 15,
        temperature: 0.1,
      }),
    });

    const elapsedMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return c.json({
        success: false,
        error: `NIM API 校验失败 (HTTP ${response.status}): ${errText || '未知响应'}`,
        latency_ms: elapsedMs,
      }, 502);
    }

    const data: any = await response.json();
    return c.json({
      success: true,
      model: modelName,
      latency_ms: elapsedMs,
      source: isCustom ? 'Client Custom Key' : 'Worker Environment Key',
      message: '✅ NVIDIA NIM API 连接正常！已成功完成握手与模型响应。',
      response_snippet: data.choices?.[0]?.message?.content?.trim() || 'OK',
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: `连接测试异常: ${err.message || String(err)}`,
      latency_ms: Date.now() - startTime,
    }, 502);
  }
});

/**
 * POST /api/ai/extract-server
 * Accepts pasted text or an image (base64) and uses the configured AI model
 * to extract structured server information.
 */
app.post('/extract-server', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { apiKey, apiUrl, modelName } = resolveAiCredentials(c, body);

  if (!apiKey) {
    return c.json({ error: 'AI model not configured. Set AI_MODEL_API_URL and AI_MODEL_API_KEY in Worker env or provide key in dashboard.' }, 400);
  }

  const { text, images } = body;

  if (!text && (!images || images.length === 0)) {
    return c.json({ error: 'No content provided. Send text and/or images.' }, 400);
  }

  // Build the user message content
  const userContent: unknown[] = [
    {
      type: 'text',
      text: `Extract server connection information from the following content. Return ONLY valid JSON with these fields:
{
  "name": "server name/hostname",
  "host": "SSH connection address — use public IP if available, otherwise internal IP",
  "port": 22,
  "username": "SSH login username (NOT the web console username, find the actual SSH user)",
  "ssh_username": "same as 'username' — the SSH login user",
  "internal_ip": "private/internal IP address (10.x.x.x, 172.x.x.x, 192.168.x.x, or cloud private IP)",
  "external_ip": "public/external IP address if visible",
  "auth_method": "key or password",
  "key_content": "full private key content if provided (ensure proper line breaks)",
  "password": "password if auth_method is password",
  "gpu_model": "GPU model if visible",
  "gpu_memory_gb": number,
  "cpu_cores": number,
  "ram_gb": number,
  "disk_gb": number,
  "provider": "cloud operator/provider if visible (e.g. AutoDL, RunPod, Vast.ai, AlibabaCloud, TencentCloud, etc.)",
  "vendor_url": "cloud provider URL if visible",
  "tags": ["any", "relevant", "tags"],
  "notes": "any other useful information"
}

Rules:
- CRITICAL: Distinguish SSH username from web console username. The SSH user is what you use with "ssh user@host", NOT the cloud console login.
- CRITICAL: Distinguish internal/private IP from external/public IP. Set "host" to the public IP if visible, otherwise internal IP.
- CRITICAL: Decide auth_method from the actual credential present, not from labels:
  - If an SSH PRIVATE KEY block is present (a line containing "-----BEGIN" ... "PRIVATE KEY-----", possibly OPENSSH/RSA/EC/DSA/PKCS8), set auth_method to "key" and put the FULL key verbatim in key_content, preserving every line break. Leave password empty.
  - Otherwise, if a login password is present, set auth_method to "password" and put it in the password field. Leave key_content empty.
  - A key path like "~/.ssh/id_rsa" or "id_ed25519.pem" without the key body still means auth_method "key"; put the path in notes.
  - If BOTH a private key and a password appear, prefer "key".
  - If neither is visible, set auth_method to "password" and leave the credential empty.
- Never put a password value inside key_content, and never put a private key inside password.
- For images, read all visible text including IPs, credentials, GPU info, etc.
- If exact values aren't visible, make reasonable inferences and note them.
- Always include port (default 22 if not specified).
- Return JSON ONLY, no other text.`
    }
  ];

  // Add text if provided (separate from the instruction)
  if (text) {
    userContent.push({
      type: 'text',
      text: `Here is the text content to extract from:\n\n${text}`
    });
  }

  // Add all images if provided
  if (images && Array.isArray(images)) {
    for (const img of images) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mime_type || 'image/png'};base64,${img.base64}`
        }
      });
    }
  }

  try {
    const baseUrl = apiUrl.replace(/\/$/, '');
    // OpenAI-compatible API path: /v1/chat/completions
    const apiPath = baseUrl.includes('/v1/') ? '/chat/completions' : '/v1/chat/completions';
    const fullUrl = baseUrl + apiPath;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'dsh-mcp-server/1.0'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a server information extraction assistant. Extract structured server connection details from user-provided text or images. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({
        error: `AI model API error (${response.status}) calling ${fullUrl}. Response: ${errorText || '(empty)'}`
      }, 502);
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return c.json({ error: 'AI model returned empty response' }, 502);
    }

    // Parse the JSON response
    let extracted: ExtractedServerInfo;
    try {
      // Try direct parse first
      extracted = JSON.parse(content);
    } catch {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        return c.json({ error: `Failed to parse AI response as JSON: ${content.substring(0, 200)}` }, 502);
      }
    }

    // Auto-format SSH key if provided
    if (extracted.key_content) {
      extracted.key_content = formatSshKey(extracted.key_content);
    }

    // Content-based auth_method detection — do not blindly trust the model's own
    // auth_method field, which it sometimes omits or gets wrong. Decide from what
    // credential material is actually present.
    extracted.auth_method = detectAuthMethod(extracted);

    // Ensure port defaults to 22
    if (!extracted.port) {
      extracted.port = 22;
    }

    return c.json({ success: true, data: extracted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `AI model call failed: ${msg}` }, 502);
  }
});

/**
 * Decide auth_method from the credential material actually extracted, rather than
 * trusting the model's self-reported auth_method (which it sometimes omits or gets
 * wrong). A real private-key body wins over a password; a bare key path still counts
 * as key auth.
 */
export function detectAuthMethod(e: ExtractedServerInfo): 'key' | 'password' {
  const key = (e.key_content || '').trim();
  const hasKeyBody = /-----BEGIN[\s\S]*PRIVATE KEY-----/i.test(key);
  const hasKeyPath = !hasKeyBody && /\.(pem|key)$|id_(rsa|ed25519|ecdsa|dsa)/i.test(key || (e.notes || ''));
  const hasPassword = !!(e.password && e.password.trim());

  if (hasKeyBody) return 'key';
  if (hasPassword) return 'password';
  if (hasKeyPath) return 'key';
  // Fall back to the model's hint if it gave a valid one, else default to password.
  return e.auth_method === 'key' ? 'key' : 'password';
}

/**
 * Format an SSH private key with proper line breaks.
 * Handles keys pasted as a single line or with incorrect formatting.
 */
function formatSshKey(key: string): string {
  let cleaned = key.trim();

  // If it looks like it's already formatted with headers and line breaks
  if (cleaned.includes('-----BEGIN') && cleaned.includes('\n')) {
    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n');
    // Ensure proper wrapping of the base64 body (standard is 64-char width)
    return cleaned;
  }

  // If it's a raw key without headers, try to detect and format
  const beginMatch = cleaned.match(/-----BEGIN\s*(RSA|EC|DSA|OPENSSH|PRIVATE)\s*KEY-----/i);
  const endMatch = cleaned.match(/-----END\s*(RSA|EC|DSA|OPENSSH|PRIVATE)\s*KEY-----/i);

  if (beginMatch && endMatch) {
    const beginHeader = beginMatch[0];
    const endFooter = endMatch[0];
    const startIdx = cleaned.indexOf(beginHeader) + beginHeader.length;
    const endIdx = cleaned.indexOf(endFooter);

    let body = cleaned.substring(startIdx, endIdx).trim();
    // Remove any spaces or non-base64 characters
    body = body.replace(/[^A-Za-z0-9+/=]/g, '');

    // Wrap at 64 characters
    const wrapped = body.match(/.{1,64}/g)?.join('\n') || body;

    return `${beginHeader}\n${wrapped}\n${endFooter}\n`;
  }

  // If no recognizable format, return as-is (user may need to correct)
  return cleaned;
}

/**
 * POST /api/ai/extract-proxy
 * Accepts pasted text or images and extracts proxy node information.
 */
app.post('/extract-proxy', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { apiKey, apiUrl, modelName } = resolveAiCredentials(c, body);

  if (!apiKey) {
    return c.json({ error: 'AI model not configured. Set AI_MODEL_API_URL and AI_MODEL_API_KEY in Worker env or provide key in dashboard.' }, 400);
  }

  const { text, images } = body;

  if (!text && (!images || images.length === 0)) {
    return c.json({ error: 'No content provided.' }, 400);
  }

  const systemMsg = 'You are a proxy node information extraction assistant. Extract structured SOCKS5/HTTP proxy connection details from user-provided text or images. Return ONLY valid JSON.';

  const userMsg = `Extract proxy/VPN node information from the following content. Return ONLY valid JSON with these fields:
{
  "name": "proxy node name/hostname",
  "host": "proxy server IP or domain",
  "port": 1080,
  "username": "proxy auth username (if any)",
  "password": "proxy auth password (if any)",
  "location": "geographic location like Hong Kong, Japan, US West",
  "protocol": "socks5 or http"
}

Rules:
- Default port is 1080 for SOCKS5, 3128 for HTTP
- If you see subscription info or proxy config text, extract all visible nodes
- If multiple proxies are visible, return the first/primary one
- Return JSON ONLY, no other text.`;

  const userContent: unknown[] = [{ type: 'text', text: userMsg }];
  if (text) userContent.push({ type: 'text', text: `Content to extract from:\n\n${text}` });
  if (images && Array.isArray(images)) {
    for (const img of images) {
      userContent.push({ type: 'image_url', image_url: { url: `data:${img.mime_type || 'image/png'};base64,${img.base64}` } });
    }
  }

  try {
    const baseUrl = apiUrl.replace(/\/$/, '');
    const apiPath = baseUrl.includes('/v1/') ? '/chat/completions' : '/v1/chat/completions';
    const response = await fetch(baseUrl + apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'User-Agent': 'dsh-mcp-server/1.0' },
      body: JSON.stringify({ model: modelName, messages: [{ role: 'system', content: systemMsg }, { role: 'user', content: userContent }], temperature: 0.1, max_tokens: 1000 })
    });

    if (!response.ok) {
      const err = await response.text();
      return c.json({ error: `AI model API error (${response.status}): ${err}` }, 502);
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) return c.json({ error: 'AI model returned empty response' }, 502);

    let extracted: any;
    try { extracted = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) extracted = JSON.parse(m[0]); else return c.json({ error: 'Failed to parse AI response' }, 502);
    }

    if (!extracted.port) extracted.port = extracted.protocol === 'http' ? 3128 : 1080;
    if (!extracted.protocol) extracted.protocol = 'socks5';

    return c.json({ success: true, data: extracted });
  } catch (err) {
    return c.json({ error: `AI model call failed: ${err}` }, 502);
  }
});

export default app;
