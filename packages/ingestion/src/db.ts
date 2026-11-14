/**
 * Postgres persistence layer for ingested telemetry events.
 *
 * The schema is intentionally minimal: a single `telemetry_events` table
 * whose columns mirror `TelemetryEvent` from @tracelens/shared. The JSON
 * `attributes` column keeps the schema stable as the attributes bag grows.
 *
 * Consumers (correlation, graph) read from this table directly.
 */
import pg from 'pg';
import type { TelemetryEvent } from '@tracelens/shared';

const { Pool } = pg;

export type DbPool = pg.Pool;

/** Build a pool from env vars (with safe defaults for local dev). */
export function createPool(): DbPool {
  return new Pool({
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: Number(process.env['POSTGRES_PORT'] ?? 5432),
    database: process.env['POSTGRES_DB'] ?? 'tracelens',
    user: process.env['POSTGRES_USER'] ?? 'tracelens',
    password: process.env['POSTGRES_PASSWORD'] ?? 'tracelens',
  });
}

/** Ensure the telemetry_events table exists (idempotent). */
export async function ensureSchema(pool: DbPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id          BIGSERIAL PRIMARY KEY,
      type        TEXT        NOT NULL,
      service     TEXT        NOT NULL,
      event_ts    TIMESTAMPTZ NOT NULL,
      name        TEXT        NOT NULL,
      value       DOUBLE PRECISION,
      trace_id    TEXT,
      span_id     TEXT,
      parent_span_id TEXT,
      attributes  JSONB,
      inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/** Persist a single telemetry event and return its generated id. */
export async function insertEvent(pool: DbPool, event: TelemetryEvent): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO telemetry_events
       (type, service, event_ts, name, value, trace_id, span_id, parent_span_id, attributes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      event.type,
      event.service,
      event.timestamp,
      event.name,
      event.value ?? null,
      event.traceId ?? null,
      event.spanId ?? null,
      event.parentSpanId ?? null,
      event.attributes ? JSON.stringify(event.attributes) : null,
    ],
  );
  return rows[0]!.id;
}

/** Persist multiple events in a single transaction. Returns the generated ids. */
export async function insertEvents(pool: DbPool, events: TelemetryEvent[]): Promise<number[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids: number[] = [];
    for (const event of events) {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO telemetry_events
           (type, service, event_ts, name, value, trace_id, span_id, parent_span_id, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          event.type,
          event.service,
          event.timestamp,
          event.name,
          event.value ?? null,
          event.traceId ?? null,
          event.spanId ?? null,
          event.parentSpanId ?? null,
          event.attributes ? JSON.stringify(event.attributes) : null,
        ],
      );
      ids.push(rows[0]!.id);
    }
    await client.query('COMMIT');
    return ids;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
