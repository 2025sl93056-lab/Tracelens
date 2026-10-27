/**
 * PostgreSQL data layer — connection helper + migration scaffolding (M3).
 *
 * OWNER: Member 3 (Dependency Graph & Backend Platform)
 *
 * This is the shared Postgres plumbing the API (and, by coordination, the
 * ingestion service) build on. It is intentionally lazy: importing this module
 * never opens a socket. A {@link Pool} is created only when {@link createPool}
 * is called, and a pool does not connect until its first query — so the API can
 * boot, serve seeded data, and run its test suite with no database present.
 *
 * The schema lives next to this file in `migrations/001_init.sql` and is applied
 * by {@link runMigrations}. It is idempotent (`CREATE TABLE IF NOT EXISTS`), so
 * it is safe to run on every boot once a database is wired up.
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';

/** Resolved connection settings for the shared Postgres instance. */
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const DEFAULTS: DbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'tracelens',
  password: 'tracelens',
  database: 'tracelens',
};

/**
 * Build a {@link DbConfig} from environment variables, falling back to the
 * local dev defaults used by `docker-compose.yml` / `.env.example`.
 */
export function loadDbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const port = Number.parseInt(env.POSTGRES_PORT ?? '', 10);
  return {
    host: env.POSTGRES_HOST ?? DEFAULTS.host,
    port: Number.isNaN(port) ? DEFAULTS.port : port,
    user: env.POSTGRES_USER ?? DEFAULTS.user,
    password: env.POSTGRES_PASSWORD ?? DEFAULTS.password,
    database: env.POSTGRES_DB ?? DEFAULTS.database,
  };
}

/**
 * Create a connection pool. Does NOT connect — the pool lazily opens
 * connections on first use. Callers own the returned pool and must `end()` it.
 */
export function createPool(config: DbConfig = loadDbConfigFromEnv()): Pool {
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  };
  return new pg.Pool(poolConfig);
}

/** Read the SQL schema/migration bundled with this package. */
export function readMigrationSql(): string {
  return readFileSync(new URL('../migrations/001_init.sql', import.meta.url), 'utf8');
}

/**
 * Apply the schema to the connected database. Idempotent. Call once at boot
 * after wiring a real Postgres instance; not used by the seeded in-memory path.
 */
export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(readMigrationSql());
}
