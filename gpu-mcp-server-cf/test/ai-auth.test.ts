import { describe, it, expect } from 'vitest';
import { detectAuthMethod } from '../src/api/ai';

const KEY = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXk=\n-----END OPENSSH PRIVATE KEY-----';

describe('detectAuthMethod', () => {
  it('picks key when a private-key body is present, even if model said password', () => {
    expect(detectAuthMethod({ auth_method: 'password', key_content: KEY })).toBe('key');
  });

  it('picks password when only a password is present', () => {
    expect(detectAuthMethod({ password: 'hunter2' })).toBe('password');
  });

  it('prefers key when both a key body and a password appear', () => {
    expect(detectAuthMethod({ key_content: KEY, password: 'hunter2' })).toBe('key');
  });

  it('treats a bare .pem/.key path as key auth', () => {
    expect(detectAuthMethod({ key_content: '~/.ssh/id_ed25519' })).toBe('key');
    expect(detectAuthMethod({ notes: 'use mykey.pem', key_content: '' })).toBe('key');
  });

  it('does not misread a password sitting in key_content as a key body', () => {
    // no BEGIN block, no path pattern -> falls back to password
    expect(detectAuthMethod({ key_content: 'justaplainpassword', password: 'p' })).toBe('password');
  });

  it('honors the model hint of key when nothing else is present', () => {
    expect(detectAuthMethod({ auth_method: 'key' })).toBe('key');
  });

  it('defaults to password when neither credential nor hint is present', () => {
    expect(detectAuthMethod({})).toBe('password');
  });
});
