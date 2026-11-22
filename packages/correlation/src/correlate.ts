/**
 * CLI entry: run one correlation pass against the live Postgres database.
 *
 *   node dist/correlate.js
 *
 * Reads POSTGRES_* env vars (same convention as ingestion/api), runs the
 * correlation job once, prints a one-line summary, and exits. Intended to be
 * invoked on a schedule (cron / compose one-shot) or manually during a demo.
 */
import pg from 'pg';
import { runCorrelationJob } from './runner.js';

function createPool(): pg.Pool {
  return new pg.Pool({
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: Number(process.env['POSTGRES_PORT'] ?? 5432),
    database: process.env['POSTGRES_DB'] ?? 'tracelens',
    user: process.env['POSTGRES_USER'] ?? 'tracelens',
    password: process.env['POSTGRES_PASSWORD'] ?? 'tracelens',
  });
}

async function main(): Promise<void> {
  const pool = createPool();
  try {
    const result = await runCorrelationJob(pool);
    console.log(
      `correlation: read ${result.eventsRead} events, wrote ${result.incidentsWritten} incident(s)`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('correlation run failed:', err);
  process.exitCode = 1;
});
