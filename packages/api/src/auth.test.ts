import { describe, it, expect } from 'vitest';
import type { AuthConfig } from './auth.js';
import { authenticate, issueToken, verifyToken } from './auth.js';

function testConfig(): AuthConfig {
  return {
    secret: 'test-secret',
    expiresInSeconds: 3600,
    users: new Map([
      ['admin', { password: 'admin-pw', role: 'admin' }],
      ['viewer', { password: 'viewer-pw', role: 'viewer' }],
    ]),
  };
}

describe('authenticate', () => {
  it('accepts valid credentials and returns the role', () => {
    const config = testConfig();
    expect(authenticate(config, 'admin', 'admin-pw')).toEqual({ username: 'admin', role: 'admin' });
    expect(authenticate(config, 'viewer', 'viewer-pw')).toEqual({
      username: 'viewer',
      role: 'viewer',
    });
  });

  it('rejects a wrong password', () => {
    expect(authenticate(testConfig(), 'admin', 'nope')).toBeNull();
  });

  it('rejects an unknown user', () => {
    expect(authenticate(testConfig(), 'ghost', 'whatever')).toBeNull();
  });
});

describe('issueToken / verifyToken', () => {
  it('round-trips an authenticated user', () => {
    const config = testConfig();
    const token = issueToken(config, { username: 'viewer', role: 'viewer' });
    expect(verifyToken(config, token)).toEqual({ username: 'viewer', role: 'viewer' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = issueToken(testConfig(), { username: 'admin', role: 'admin' });
    const other: AuthConfig = { ...testConfig(), secret: 'other-secret' };
    expect(verifyToken(other, token)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyToken(testConfig(), 'not-a-jwt')).toBeNull();
  });
});
