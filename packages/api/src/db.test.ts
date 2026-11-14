import { describe, it, expect } from 'vitest';
import { loadDbConfigFromEnv, createPool, readMigrationSql } from './db.js';

describe('loadDbConfigFromEnv', () => {
  it('reads settings from the environment', () => {
    const config = loadDbConfigFromEnv({
      POSTGRES_HOST: 'db.internal',
      POSTGRES_PORT: '6000',
      POSTGRES_USER: 'u',
      POSTGRES_PASSWORD: 'p',
      POSTGRES_DB: 'tl',
    });
    expect(config).toEqual({
      host: 'db.internal',
      port: 6000,
      user: 'u',
      password: 'p',
      database: 'tl',
    });
  });

  it('falls back to local dev defaults', () => {
    const config = loadDbConfigFromEnv({});
    expect(config).toEqual({
      host: 'localhost',
      port: 5432,
      user: 'tracelens',
      password: 'tracelens',
      database: 'tracelens',
    });
  });

  it('ignores a non-numeric port', () => {
    expect(loadDbConfigFromEnv({ POSTGRES_PORT: 'nope' }).port).toBe(5432);
  });
});

describe('readMigrationSql', () => {
  it('bundles the schema for every core table', () => {
    const sql = readMigrationSql();
    for (const table of ['services', 'edges', 'telemetry', 'incidents']) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });
});

describe('createPool', () => {
  it('creates a pool without connecting', async () => {
    const pool = createPool({
      host: 'localhost',
      port: 5432,
      user: 'tracelens',
      password: 'tracelens',
      database: 'tracelens',
    });
    expect(typeof pool.query).toBe('function');
    // No query is issued, so no connection is opened; just release resources.
    await pool.end();
  });
});
