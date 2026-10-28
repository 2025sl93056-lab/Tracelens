/**
 * ingestion — telemetry intake API.
 *
 * OWNER: Member 1 (Telemetry & Demo Environment)
 *
 * Exports `parseTelemetryEvent` for use by server.ts and tests.
 * Run `node dist/index.js` (or `npm start`) to start the HTTP server.
 */
import { isTelemetryType, type TelemetryEvent } from '@tracelens/shared';

/** Narrow unknown JSON into a TelemetryEvent, or throw a descriptive error. */
export function parseTelemetryEvent(input: unknown): TelemetryEvent {
  if (typeof input !== 'object' || input === null) {
    throw new Error('telemetry event must be an object');
  }
  const e = input as Record<string, unknown>;
  if (!isTelemetryType(e.type)) {
    throw new Error(`invalid telemetry type: ${String(e.type)}`);
  }
  if (typeof e.service !== 'string' || e.service.length === 0) {
    throw new Error('telemetry event requires a non-empty "service"');
  }
  if (typeof e.timestamp !== 'string' || Number.isNaN(Date.parse(e.timestamp))) {
    throw new Error('telemetry event requires a valid ISO-8601 "timestamp"');
  }
  if (typeof e.name !== 'string' || e.name.length === 0) {
    throw new Error('telemetry event requires a non-empty "name"');
  }
  if (e.value !== undefined && typeof e.value !== 'number') {
    throw new Error('telemetry "value" must be a number when present');
  }
  return input as TelemetryEvent;
}

// Start the HTTP server when run directly (not imported by tests).
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  const { createApp } = await import('./server.js');
  const { createPool, ensureSchema } = await import('./db.js');

  const port = Number(process.env['INGESTION_PORT'] ?? 4001);
  const apiKey = process.env['INGESTION_API_KEY'] ?? 'dev-ingest-key';

  const pool = createPool();
  await ensureSchema(pool);

  const app = createApp(pool, apiKey);
  app.listen(port, () => {
    console.log(`[ingestion] listening on port ${port}`);
  });
}
