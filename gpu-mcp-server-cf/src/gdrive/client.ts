/**
 * Google Drive REST API v3 Client for Cloudflare Workers.
 * Pure Edge implementation using Web Crypto API (RS256 PKCS#8) with zero external npm dependencies.
 */

export interface GDriveServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
}

export interface GDriveConfig {
  serviceAccount?: GDriveServiceAccount;
  rootFolderId?: string;
  apiKey?: string;
}

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  parents?: string[];
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  md5Checksum?: string;
}

export interface GDriveListResult {
  files: GDriveFile[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export interface GDriveQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  userEmail?: string;
  userName?: string;
}

// In-memory token cache (persists within Worker isolate lifecycle)
interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

/**
 * Convert Base64 string to Base64URL string
 */
function base64UrlEncode(str: string | ArrayBuffer): string {
  let base64 = '';
  if (typeof str === 'string') {
    base64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    const bytes = new Uint8Array(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Import a PKCS#8 PEM private key into CryptoKey
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleanPem = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');

  const binaryDer = atob(cleanPem);
  const buffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    buffer[i] = binaryDer.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    buffer.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );
}

/**
 * Obtain a Google OAuth 2.0 Access Token via Service Account JWT flow
 */
export async function getGoogleDriveAccessToken(sa: GDriveServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (tokenCache && tokenCache.expiresAt > now + 300) {
    return tokenCache.token;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

  const cryptoKey = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signedJwt = `${unsignedToken}.${base64UrlEncode(signature)}`;

  // Exchange JWT for access token
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }).toString(),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google OAuth token exchange failed (${tokenResp.status}): ${errText}`);
  }

  const tokenData = await tokenResp.json() as { access_token: string; expires_in: number };
  tokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };

  return tokenCache.token;
}

/**
 * List or search files from Google Drive
 */
export async function listGDriveFiles(
  config: GDriveConfig,
  options: {
    folderId?: string;
    query?: string;
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
  } = {}
): Promise<GDriveListResult> {
  const queryParts: string[] = ['trashed = false'];

  // Target specific folder or root folder (including folders shared with this service account)
  const targetFolderId = options.folderId || config.rootFolderId;
  if (targetFolderId && targetFolderId !== 'root_all') {
    queryParts.push(`'${targetFolderId}' in parents`);
  } else if (!options.query) {
    queryParts.push(`('root' in parents or sharedWithMe = true)`);
  }

  if (options.query) {
    const sanitized = options.query.replace(/'/g, "\\'");
    queryParts.push(`name contains '${sanitized}'`);
  }

  const q = queryParts.join(' and ');
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 30));

  const params = new URLSearchParams({
    q,
    pageSize: pageSize.toString(),
    fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,iconLink,parents,thumbnailLink,owners,md5Checksum)',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  // Google Drive API v3: orderBy is not allowed when fullText query is used.
  if (!q.includes('fullText')) {
    const orderBy = options.orderBy || 'folder,modifiedTime desc,name';
    params.set('orderBy', orderBy);
  }

  if (options.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  const headers: Record<string, string> = {};
  if (config.serviceAccount) {
    const accessToken = await getGoogleDriveAccessToken(config.serviceAccount);
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (config.apiKey) {
    params.set('key', config.apiKey);
  } else {
    throw new Error('No Google Drive authentication configured (Service Account or API Key required)');
  }

  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Drive list API failed (${resp.status}): ${errText}`);
  }

  return (await resp.json()) as GDriveListResult;
}

/**
 * Get detailed metadata of a specific file
 */
export async function getGDriveFile(
  config: GDriveConfig,
  fileId: string
): Promise<GDriveFile> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,iconLink,parents,thumbnailLink,owners,md5Checksum',
    supportsAllDrives: 'true',
  });

  const headers: Record<string, string> = {};
  if (config.serviceAccount) {
    const accessToken = await getGoogleDriveAccessToken(config.serviceAccount);
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (config.apiKey) {
    params.set('key', config.apiKey);
  } else {
    throw new Error('No Google Drive authentication configured');
  }

  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`, {
    headers,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Drive get file failed (${resp.status}): ${errText}`);
  }

  return (await resp.json()) as GDriveFile;
}

/**
 * Get Google Drive storage quota and user info
 */
export async function getGDriveStorageQuota(config: GDriveConfig): Promise<GDriveQuota> {
  const params = new URLSearchParams({
    fields: 'storageQuota,user',
  });

  const headers: Record<string, string> = {};
  if (config.serviceAccount) {
    const accessToken = await getGoogleDriveAccessToken(config.serviceAccount);
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (config.apiKey) {
    params.set('key', config.apiKey);
  } else {
    throw new Error('No Google Drive authentication configured');
  }

  const resp = await fetch(`https://www.googleapis.com/drive/v3/about?${params.toString()}`, {
    headers,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Drive about API failed (${resp.status}): ${errText}`);
  }

  const data = await resp.json() as {
    storageQuota?: { limit?: string; usage?: string; usageInDrive?: string; usageInDriveTrash?: string };
    user?: { displayName?: string; emailAddress?: string };
  };

  return {
    limit: data.storageQuota?.limit,
    usage: data.storageQuota?.usage,
    usageInDrive: data.storageQuota?.usageInDrive,
    usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
    userName: data.user?.displayName,
    userEmail: data.user?.emailAddress,
  };
}

/**
 * Helper to parse configuration from Env or D1 system settings
 */
export function parseGDriveConfig(
  env: { GDRIVE_SERVICE_ACCOUNT_JSON?: string; GDRIVE_ROOT_FOLDER_ID?: string },
  dbSettingJson?: string | null,
  dbFolderId?: string | null
): GDriveConfig | null {
  const jsonStr = dbSettingJson || env.GDRIVE_SERVICE_ACCOUNT_JSON;
  const rootFolderId = dbFolderId || env.GDRIVE_ROOT_FOLDER_ID;

  if (!jsonStr) return null;

  try {
    const sa = JSON.parse(jsonStr) as GDriveServiceAccount;
    if (!sa.client_email || !sa.private_key) return null;
    return {
      serviceAccount: sa,
      rootFolderId: rootFolderId || undefined,
    };
  } catch (e) {
    return null;
  }
}
