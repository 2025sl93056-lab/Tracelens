/**
 * Integration tests for the ingestion HTTP API.
 *
 * These tests require a running Postgres instance. They are skipped automatically
 * when POSTGRES_HOST is not set (e.g. in environments without Docker).
 *
 * To run locally:
 *   docker compose up -d postgres
 *   POSTGRES_HOST=localhost npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, ensureSchema, type DbPool } from './db.js';
import { createApp } from './server.js';
import type { Express } from 'express';

const TEST_API_KEY = 'test-key-123';
const POSTGRES_AVAILABLE = Boolean(process.env['POSTGRES_HOST']);

const VALID_EVENT = {
  type: 'metric',
  service: 'payment-service',
  timestamp: '2026-10-18T14:32:18.000Z',
  name: 'http.latency.ms',
  value: 1240,
};

/** Minimal fetch wrapper around the Express app (no real network needed). */
async function request(
  app: Express,
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  const { default: supertest } = await import('supertest');
  const req = supertest(app)[method as 'get' | 'post'](path);
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      req.set(k, v);
    }
  }
  if (body !== undefined) {
    req.set('Content-Type', 'application/json').send(body as object | string);
  }
  const res = await req;
  return { status: res.status, body: res.body };
}

describe('GET /health', () => {
  it('returns 200 with service info (no auth required)', async () => {
    const app = createApp({ query: async () => ({ rows: [] }) } as unknown as DbPool, TEST_API_KEY);
    const { status, body } = await request(app, 'get', '/health');
    expect(status).toBe(200);
    expect((body as { status: string }).status).toBe('ok');
    expect((body as { service: string }).service).toBe('tracelens-ingestion');
  });
});

describe('POST /telemetry — auth', () => {
  it('returns 401 when no API key is provided', async () => {
    const app = createApp({ query: async () => ({ rows: [] }) } as unknown as DbPool, TEST_API_KEY);
    const { status } = await request(app, 'post', '/telemetry', VALID_EVENT);
    expect(status).toBe(401);
  });

  it('returns 401 for a wrong API key', async () => {
    const app = createApp({ query: async () => ({ rows: [] }) } as unknown as DbPool, TEST_API_KEY);
    const { status } = await request(app, 'post', '/telemetry', VALID_EVENT, {
      'x-api-key': 'wrong-key',
    });
    expect(status).toBe(401);
  });

  it('accepts the key via x-api-key header', async () => {
    const app = createApp(
      { query: async () => ({ rows: [{ id: 1 }] }) } as unknown as DbPool,
      TEST_API_KEY,
    );
    const { status } = await request(app, 'post', '/telemetry', VALID_EVENT, {
      'x-api-key': TEST_API_KEY,
    });
    expect(status).toBe(201);
  });

  it('accepts the key via Authorization: Bearer header', async () => {
    const app = createApp(
      { query: async () => ({ rows: [{ id: 1 }] }) } as unknown as DbPool,
      TEST_API_KEY,
    );
    const { status } = await request(app, 'post', '/telemetry', VALID_EVENT, {
      Authorization: `Bearer ${TEST_API_KEY}`,
    });
    expect(status).toBe(201);
  });
});

describe('POST /telemetry — validation', () => {
  const app = createApp(
    { query: async () => ({ rows: [{ id: 1 }] }) } as unknown as DbPool,
    TEST_API_KEY,
  );
  const authHeader = { 'x-api-key': TEST_API_KEY };

  it('returns 400 for invalid telemetry type', async () => {
    const { status, body } = await request(
      app,
      'post',
      '/telemetry',
      { ...VALID_EVENT, type: 'unknown' },
      authHeader,
    );
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/invalid telemetry type/);
  });

  it('returns 400 when service is missing', async () => {
    const { type, timestamp, name, value } = VALID_EVENT;
    const { status } = await request(app, 'post', '/telemetry', { type, timestamp, name, value }, authHeader);
    expect(status).toBe(400);
  });

  it('returns 400 for a non-object body', async () => {
    const { status } = await request(app, 'post', '/telemetry', 'not-an-object', authHeader);
    expect(status).toBe(400);
  });
});

describe('POST /telemetry/batch — validation', () => {
  const app = createApp(
    {
      connect: async () => ({
        query: async (_sql: string, _params: unknown[]) => ({ rows: [{ id: 1 }] }),
        release: () => undefined,
      }),
    } as unknown as DbPool,
    TEST_API_KEY,
  );
  const authHeader = { 'x-api-key': TEST_API_KEY };

  it('returns 400 when body is not an array', async () => {
    const { status } = await request(app, 'post', '/telemetry/batch', VALID_EVENT, authHeader);
    expect(status).toBe(400);
  });

  it('returns 400 and identifies the offending index', async () => {
    const payload = [VALID_EVENT, { ...VALID_EVENT, type: 'bad' }];
    const { status, body } = await request(app, 'post', '/telemetry/batch', payload, authHeader);
    expect(status).toBe(400);
    expect((body as { error: string }).error).toMatch(/event\[1\]/);
  });
});

describe.skipIf(!POSTGRES_AVAILABLE)('Integration — full emit → store flow', () => {
  let pool: DbPool;

  beforeAll(async () => {
    pool = createPool();
    await ensureSchema(pool);
    // Clean slate for test isolation.
    await pool.query("DELETE FROM telemetry_events WHERE service = 'integration-test-svc'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM telemetry_events WHERE service = 'integration-test-svc'");
    await pool.end();
  });

  const app = () => createApp(pool, TEST_API_KEY);

  it('persists a single event and returns its id', async () => {
    const event = { ...VALID_EVENT, service: 'integration-test-svc' };
    const { status, body } = await request(app(), 'post', '/telemetry', event, {
      'x-api-key': TEST_API_KEY,
    });
    expect(status).toBe(201);
    const id = (body as { id: number }).id;
    expect(typeof id).toBe('number');

    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM telemetry_events WHERE id = $1',
      [id],
    );
    expect(rows[0]?.name).toBe(VALID_EVENT.name);
  });

  it('persists a batch and returns all ids', async () => {
    const events = [
      { ...VALID_EVENT, service: 'integration-test-svc', name: 'batch.a' },
      { ...VALID_EVENT, service: 'integration-test-svc', name: 'batch.b', type: 'log' },
    ];
    const { status, body } = await request(app(), 'post', '/telemetry/batch', events, {
      'x-api-key': TEST_API_KEY,
    });
    expect(status).toBe(201);
    const ids = (body as { ids: number[] }).ids;
    expect(ids).toHaveLength(2);

    const { rows } = await pool.query<{ name: string }>(
      'SELECT name FROM telemetry_events WHERE id = ANY($1::bigint[])',
      [ids],
    );
    const names = rows.map((r) => r.name).sort();
    expect(names).toEqual(['batch.a', 'batch.b']);
  });
});
