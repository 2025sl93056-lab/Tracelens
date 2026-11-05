import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('browser API routing', () => {
  it.each([undefined, ''])('uses the same-origin proxy when the API base is %s', async (base) => {
    vi.stubEnv('VITE_API_BASE_URL', base);
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'synthetic-token', role: 'viewer' }),
    });
    vi.stubGlobal('fetch', fetch);
    const { api } = await import('./client.js');

    await api.login({ username: 'viewer', password: 'synthetic-password' });

    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'viewer', password: 'synthetic-password' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('preserves an explicit API base and forwards the session token', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetch);
    const { api, setToken } = await import('./client.js');
    setToken('synthetic-token');

    await api.incidents();

    expect(fetch).toHaveBeenCalledWith('https://api.example.test/incidents', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer synthetic-token',
      },
    });
  });
});
