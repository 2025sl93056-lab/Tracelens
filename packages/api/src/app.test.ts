import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { DependencyGraph, Incident, IncidentSummary, LoginResponse } from '@tracelens/shared';
import { createApp } from './app.js';
import type { AuthConfig } from './auth.js';
import { InMemoryDataStore } from './repository.js';

/**
 * Integration tests: start the real Express app on an ephemeral port and drive
 * it with HTTP (global fetch). No database and no extra test deps required.
 */
const auth: AuthConfig = {
  secret: 'it-secret',
  expiresInSeconds: 3600,
  users: new Map([
    ['admin', { password: 'admin-pw', role: 'admin' }],
    ['viewer', { password: 'viewer-pw', role: 'viewer' }],
  ]),
};

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp({ store: new InMemoryDataStore(), auth, version: '9.9.9' });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

async function login(username: string, password: string): Promise<Response> {
  return fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

async function token(username: string, password: string): Promise<string> {
  const res = await login(username, password);
  const body = (await res.json()) as LoginResponse;
  return body.token;
}

function auth_header(t: string): Record<string, string> {
  return { authorization: `Bearer ${t}` };
}

describe('GET /health', () => {
  it('is public and reports ok', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', service: 'tracelens-api', version: '9.9.9' });
  });
});

describe('POST /auth/login', () => {
  it('returns a token and role for valid credentials', async () => {
    const res = await login('admin', 'admin-pw');
    expect(res.status).toBe(200);
    const body = (await res.json()) as LoginResponse;
    expect(body.role).toBe('admin');
    expect(typeof body.token).toBe('string');
  });

  it('rejects invalid credentials with 401', async () => {
    expect((await login('admin', 'wrong')).status).toBe(401);
    expect((await login('ghost', 'x')).status).toBe(401);
  });

  it('rejects a malformed body with 400', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('auth middleware (authorized vs rejected)', () => {
  it('rejects a protected route with no token (401)', async () => {
    expect((await fetch(`${base}/incidents`)).status).toBe(401);
  });

  it('rejects a protected route with a bad token (401)', async () => {
    const res = await fetch(`${base}/incidents`, { headers: auth_header('garbage') });
    expect(res.status).toBe(401);
  });

  it('allows a protected route with a valid viewer token (200)', async () => {
    const res = await fetch(`${base}/incidents`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(200);
  });

  it('reports the caller via GET /auth/me', async () => {
    const res = await fetch(`${base}/auth/me`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ username: 'viewer', role: 'viewer' });
  });
});

describe('RBAC (viewer vs admin)', () => {
  it('forbids viewers from the admin-only rebuild route (403)', async () => {
    const res = await fetch(`${base}/graph/rebuild`, {
      method: 'POST',
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(403);
  });

  it('allows admins to the admin-only rebuild route (200)', async () => {
    const res = await fetch(`${base}/graph/rebuild`, {
      method: 'POST',
      headers: auth_header(await token('admin', 'admin-pw')),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { nodes: number; edges: number };
    expect(body.nodes).toBeGreaterThan(0);
    expect(body.edges).toBeGreaterThan(0);
  });
});

describe('data routes', () => {
  it('GET /incidents returns summaries newest-first', async () => {
    const res = await fetch(`${base}/incidents`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    const body = (await res.json()) as IncidentSummary[];
    expect(body.map((i) => i.id)).toEqual(['INC-1043', 'INC-1042']);
    expect(body[0]).toHaveProperty('severity');
    expect(body[0]).not.toHaveProperty('timeline'); // summary, not full incident
  });

  it('GET /incidents/:id returns the full incident', async () => {
    const res = await fetch(`${base}/incidents/INC-1042`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Incident;
    expect(body.id).toBe('INC-1042');
    expect(body.candidates.length).toBeGreaterThan(0);
  });

  it('GET /incidents/:id returns 404 for an unknown id', async () => {
    const res = await fetch(`${base}/incidents/nope`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(404);
  });

  it('GET /graph returns derived nodes and CALLS edges', async () => {
    const res = await fetch(`${base}/graph`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    const graph = (await res.json()) as DependencyGraph;
    expect(graph.nodes.map((n) => n.id)).toContain('payment');
    expect(graph.edges).toContainEqual({ from: 'order', to: 'payment', kind: 'CALLS' });
  });

  it('GET /services returns service nodes', async () => {
    const res = await fetch(`${base}/services`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    const services = (await res.json()) as { id: string; kind: string }[];
    expect(services.length).toBeGreaterThan(0);
    expect(services.every((s) => s.kind === 'service')).toBe(true);
  });

  it('GET /graph/impact returns downstream nodes', async () => {
    const res = await fetch(`${base}/graph/impact?node=order`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { node: string; affected: string[] };
    expect(body.node).toBe('order');
    expect(body.affected.sort()).toEqual(['db-sim', 'inventory', 'payment']);
  });

  it('GET /graph/impact requires the node query param (400)', async () => {
    const res = await fetch(`${base}/graph/impact`, {
      headers: auth_header(await token('viewer', 'viewer-pw')),
    });
    expect(res.status).toBe(400);
  });
});
