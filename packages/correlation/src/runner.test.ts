import { describe, it, expect, vi } from 'vitest';
import { readTelemetryEvents, persistIncidents, runCorrelationJob } from './runner.js';

/** A fake Queryable that records calls and returns canned rows per SQL match. */
function fakeDb(handlers: { match: RegExp; rows: unknown[] }[]) {
  const calls: { sql: string; params?: unknown[] }[] = [];
  return {
    calls,
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      const handler = handlers.find((h) => h.match.test(sql));
      return { rows: handler ? handler.rows : [] };
    }),
  };
}

describe('readTelemetryEvents', () => {
  it('maps telemetry_events rows into TelemetryEvent objects', async () => {
    const db = fakeDb([
      {
        match: /FROM telemetry_events/i,
        rows: [
          {
            type: 'metric',
            service: 'payment',
            event_ts: new Date('2026-11-01T00:00:06.000Z'),
            name: 'latency',
            value: 900,
            trace_id: null,
            span_id: null,
            parent_span_id: null,
            attributes: null,
          },
        ],
      },
    ]);

    const events = await readTelemetryEvents(db);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'metric',
      service: 'payment',
      name: 'latency',
      value: 900,
      timestamp: '2026-11-01T00:00:06.000Z',
    });
  });

  it('returns [] when the table is empty', async () => {
    const db = fakeDb([{ match: /FROM telemetry_events/i, rows: [] }]);
    expect(await readTelemetryEvents(db)).toEqual([]);
  });
});

describe('persistIncidents', () => {
  it('upserts one row per incident', async () => {
    const db = fakeDb([]);
    const incidents = [
      {
        id: 'INC-1',
        startedAt: '2026-11-01T00:00:06.000Z',
        severity: 'critical' as const,
        status: 'open' as const,
        affectedServices: ['payment'],
        timeline: [],
        signals: [],
        changes: [],
        candidates: [],
      },
    ];

    const n = await persistIncidents(db, incidents);
    expect(n).toBe(1);
    // One INSERT ... ON CONFLICT per incident.
    const inserts = db.calls.filter((c) => /INSERT INTO incidents/i.test(c.sql));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].params?.[0]).toBe('INC-1');
  });

  it('writes nothing for an empty list', async () => {
    const db = fakeDb([]);
    const n = await persistIncidents(db, []);
    expect(n).toBe(0);
    expect(db.calls.filter((c) => /INSERT INTO incidents/i.test(c.sql))).toHaveLength(0);
  });
});

describe('runCorrelationJob', () => {
  it('reads telemetry, correlates, persists, and reports the incident count', async () => {
    const t0 = Date.parse('2026-11-01T00:00:00.000Z');
    const rows = [
      // 6 baseline points then a spike — enough to trip the detector (windowSize 5).
      ...Array.from({ length: 6 }, (_, i) => ({
        type: 'metric',
        service: 'payment',
        event_ts: new Date(t0 + i * 1000),
        name: 'latency',
        value: 100,
        trace_id: null,
        span_id: null,
        parent_span_id: null,
        attributes: null,
      })),
      {
        type: 'metric',
        service: 'payment',
        event_ts: new Date(t0 + 6000),
        name: 'latency',
        value: 900,
        trace_id: null,
        span_id: null,
        parent_span_id: null,
        attributes: null,
      },
    ];
    const db = fakeDb([{ match: /FROM telemetry_events/i, rows }]);

    const result = await runCorrelationJob(db, { windowSize: 5 });
    expect(result.incidentsWritten).toBe(1);
    expect(db.calls.some((c) => /INSERT INTO incidents/i.test(c.sql))).toBe(true);
  });

  it('writes no incidents when telemetry is quiet', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      type: 'metric',
      service: 'payment',
      event_ts: new Date(Date.parse('2026-11-01T00:00:00.000Z') + i * 1000),
      name: 'latency',
      value: 100,
      trace_id: null,
      span_id: null,
      parent_span_id: null,
      attributes: null,
    }));
    const db = fakeDb([{ match: /FROM telemetry_events/i, rows }]);

    const result = await runCorrelationJob(db, { windowSize: 5 });
    expect(result.incidentsWritten).toBe(0);
  });
});
