/**
 * Correlation runner — the live path from stored telemetry to persisted incidents.
 *
 * Reads raw telemetry the ingestion service has written to Postgres, runs the
 * full correlation pipeline over it, and writes the resulting incidents back so
 * the API can serve them. This is what turns the correlation primitives into a
 * running system rather than a library of pure functions.
 *
 * The DB is abstracted behind the minimal {@link Queryable} interface so the
 * logic is testable without a live Postgres and the correlation package does
 * not take a hard `pg` dependency in its core.
 */
import type { Incident, TelemetryEvent, TelemetryType } from '@tracelens/shared';
import { runCorrelation, type CorrelationOptions } from './pipeline.js';

/** Anything that can run a parameterised SQL query (e.g. a `pg.Pool`). */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

/** Raw shape of a `telemetry_events` row as returned by `pg`. */
interface TelemetryRow {
  type: string;
  service: string;
  event_ts: Date | string;
  name: string;
  value: number | null;
  trace_id: string | null;
  span_id: string | null;
  parent_span_id: string | null;
  attributes: Record<string, string | number | boolean> | null;
}

function toIso(ts: Date | string): string {
  return ts instanceof Date ? ts.toISOString() : new Date(ts).toISOString();
}

function rowToEvent(row: TelemetryRow): TelemetryEvent {
  const event: TelemetryEvent = {
    type: row.type as TelemetryType,
    service: row.service,
    timestamp: toIso(row.event_ts),
    name: row.name,
  };
  if (row.value !== null) event.value = row.value;
  if (row.trace_id !== null) event.traceId = row.trace_id;
  if (row.span_id !== null) event.spanId = row.span_id;
  if (row.parent_span_id !== null) event.parentSpanId = row.parent_span_id;
  if (row.attributes !== null) event.attributes = row.attributes;
  return event;
}

/**
 * Read all telemetry events from the ingestion `telemetry_events` table,
 * ordered oldest-first so the rolling-baseline detector sees them in time order.
 */
export async function readTelemetryEvents(db: Queryable): Promise<TelemetryEvent[]> {
  const { rows } = await db.query(
    `SELECT type, service, event_ts, name, value, trace_id, span_id, parent_span_id, attributes
       FROM telemetry_events
      ORDER BY event_ts ASC`,
  );
  return (rows as TelemetryRow[]).map(rowToEvent);
}

/**
 * Upsert incidents into the `incidents` table (one statement per incident).
 * Re-running the job is idempotent: an incident with the same id overwrites the
 * previous row rather than duplicating it. Returns the number written.
 */
export async function persistIncidents(db: Queryable, incidents: Incident[]): Promise<number> {
  for (const inc of incidents) {
    await db.query(
      `INSERT INTO incidents
         (id, started_at, severity, affected_services, timeline, signals, changes, candidates)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         started_at        = EXCLUDED.started_at,
         severity          = EXCLUDED.severity,
         affected_services = EXCLUDED.affected_services,
         timeline          = EXCLUDED.timeline,
         signals           = EXCLUDED.signals,
         changes           = EXCLUDED.changes,
         candidates        = EXCLUDED.candidates`,
      [
        inc.id,
        inc.startedAt,
        inc.severity,
        inc.affectedServices,
        JSON.stringify(inc.timeline),
        JSON.stringify(inc.signals),
        JSON.stringify(inc.changes),
        JSON.stringify(inc.candidates),
      ],
    );
  }
  return incidents.length;
}

/** Outcome of a single correlation run. */
export interface CorrelationJobResult {
  eventsRead: number;
  incidentsWritten: number;
}

/**
 * Run the end-to-end job: read stored telemetry → correlate → persist incidents.
 * Pure orchestration over {@link Queryable}, so callers inject whatever pool
 * (real or fake) they have.
 */
export async function runCorrelationJob(
  db: Queryable,
  options: CorrelationOptions = {},
): Promise<CorrelationJobResult> {
  const events = await readTelemetryEvents(db);
  const incidents = runCorrelation(events, options);
  const incidentsWritten = await persistIncidents(db, incidents);
  return { eventsRead: events.length, incidentsWritten };
}
