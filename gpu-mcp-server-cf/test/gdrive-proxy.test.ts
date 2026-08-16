import { describe, it, expect } from 'vitest';
import {
  detectIsChinaMainland,
  detectLocalProxy,
  resolveServerGoogleDriveStatus,
} from '../src/models/server';

describe('Server Region & Proxy Detection', () => {
  it('detects mainland China vs overseas nodes correctly', () => {
    expect(detectIsChinaMainland('mgwaebj51zqhw2m3snow.deepln.com')).toBe(true);
    expect(detectIsChinaMainland('ssh.zzai.scnet.cn')).toBe(true);
    expect(detectIsChinaMainland('cn-fj-qz-2.server.zakocloud.com')).toBe(true);
    expect(detectIsChinaMainland('159.203.15.86')).toBe(false);
    expect(detectIsChinaMainland('136.110.4.28')).toBe(false);
    expect(detectIsChinaMainland('20.243.24.162')).toBe(false);
  });

  it('detects sing-box / v2ray / clash deployment and returns usage', () => {
    const singboxServer = detectLocalProxy({
      tags: ['deepln', 'sing-box', 'global-proxy'],
      notes: 'sing-box 1.13.18 configured',
    });
    expect(singboxServer.deployed).toBe(true);
    expect(singboxServer.type).toBe('sing-box');
    expect(singboxServer.usage).toContain('00-proxy.sh');

    const noProxyServer = detectLocalProxy({
      tags: [],
      notes: null,
      top_cpu_tasks: [{ cmd: 'sshd' }],
    });
    expect(noProxyServer.deployed).toBe(false);
    expect(noProxyServer.type).toBe(null);
    expect(noProxyServer.usage).toBe(null);
  });

  it('resolves Google Drive status and routing rules', () => {
    // 1. Overseas server
    const overseas = resolveServerGoogleDriveStatus(false, { deployed: false, type: null, usage: null });
    expect(overseas.enabled).toBe(true);
    expect(overseas.status_label).toContain('海外节点');
    expect(overseas.push_command).toBe('gdrive-push <local_path> [remote_subdir]');

    // 2. China server with sing-box
    const chinaWithProxy = resolveServerGoogleDriveStatus(true, { deployed: true, type: 'sing-box', usage: 'source ...' });
    expect(chinaWithProxy.enabled).toBe(true);
    expect(chinaWithProxy.status_label).toContain('sing-box');
    expect(chinaWithProxy.setup_command).toContain('proxy=http://127.0.0.1:10809');
    expect(chinaWithProxy.push_command).toContain('http_proxy="http://127.0.0.1:10809"');

    // 3. China server without proxy -> DISABLED
    const chinaNoProxy = resolveServerGoogleDriveStatus(true, { deployed: false, type: null, usage: null });
    expect(chinaNoProxy.enabled).toBe(false);
    expect(chinaNoProxy.status_label).toContain('禁用');
    expect(chinaNoProxy.setup_command).toContain('已禁用');
    expect(chinaNoProxy.push_command).toContain('Google Drive 禁用');
  });
});
