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
  vendor_url?: string;
  tags?: string[];
  notes?: string;
}

/**
 * POST /api/ai/extract-server
 * Accepts pasted text or an image (base64) and uses the configured AI model
 * to extract structured server information.
 */
app.post('/extract-server', async (c) => {
  const apiUrl = c.env.AI_MODEL_API_URL;
  const apiKey = c.env.AI_MODEL_API_KEY;
  const modelName = c.env.AI_MODEL_NAME || 'gpt-4o';

  if (!apiUrl || !apiKey) {
    return c.json({ error: 'AI model not configured. Set AI_MODEL_API_URL and AI_MODEL_API_KEY in Worker env.' }, 400);
  }

  const body = await c.req.json();
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
  "vendor_url": "cloud provider URL if visible",
  "tags": ["any", "relevant", "tags"],
  "notes": "any other useful information"
}

Rules:
- CRITICAL: Distinguish SSH username from web console username. The SSH user is what you use with "ssh user@host", NOT the cloud console login.
- CRITICAL: Distinguish internal/private IP from external/public IP. Set "host" to the public IP if visible, otherwise internal IP.
- If you see an SSH private key (-----BEGIN...), set auth_method to "key" and put the FULL key in key_content. Preserve the exact format with proper line breaks.
- If you see a password, set auth_method to "password" and put it in the password field.
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
  const apiUrl = c.env.AI_MODEL_API_URL;
  const apiKey = c.env.AI_MODEL_API_KEY;
  const modelName = c.env.AI_MODEL_NAME || 'gpt-4o';

  if (!apiUrl || !apiKey) {
    return c.json({ error: 'AI model not configured.' }, 400);
  }

  const body = await c.req.json();
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
