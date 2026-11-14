/**
 * Seed data for the in-memory data store (M3).
 *
 * Until the full ingestion → correlation pipeline is wired to Postgres, the API
 * serves a small, realistic, deterministic dataset so the frontend (Member 4)
 * and reviewers have something concrete to develop against. The dependency
 * graph here is *derived from trace spans* via the real graph module — it is
 * not hand-written — exercising the same code path a live system would use.
 *
 * Everything conforms to the `@tracelens/shared` contracts.
 */
import type { Incident, TelemetryEvent } from '@tracelens/shared';
import { confidenceFromScore } from '@tracelens/shared';
import { deriveGraphFromSpans } from '@tracelens/graph';

/**
 * One distributed trace through the demo call chain:
 *   gateway → order → payment → db-sim
 *                └──→ inventory
 */
export const SEED_TRACE_SPANS: TelemetryEvent[] = [
  span('gateway', 's1'),
  span('order', 's2', 's1'),
  span('payment', 's3', 's2'),
  span('inventory', 's4', 's2'),
  span('db-sim', 's5', 's3'),
];

function span(service: string, spanId: string, parentSpanId?: string): TelemetryEvent {
  return {
    type: 'trace',
    service,
    timestamp: '2026-10-18T14:30:00.000Z',
    name: 'http.server',
    traceId: 'trace-seed-1',
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
  };
}

/** Build the seed dependency graph from the seed spans. */
export function buildSeedGraph() {
  return deriveGraphFromSpans(SEED_TRACE_SPANS);
}

/**
 * A representative correlated incident: a bad payment-service deploy drives a
 * latency + 5xx spike. The candidate confidence is mapped through the shared
 * `confidenceFromScore` helper so the API and UI agree on the thresholds.
 */
export const SEED_INCIDENTS: Incident[] = [
  {
    id: 'INC-1042',
    startedAt: '2026-10-18T14:32:18.000Z',
    severity: 'high',
    affectedServices: ['payment', 'order'],
    timeline: [
      { at: '2026-10-18T14:30:00.000Z', kind: 'deploy', text: 'payment deployed v4.3.1' },
      {
        at: '2026-10-18T14:32:18.000Z',
        kind: 'signal',
        text: 'payment latency +312% (300ms → 1240ms)',
      },
      { at: '2026-10-18T14:32:40.000Z', kind: 'signal', text: 'order 5xx rate climbing' },
    ],
    signals: [
      { metric: 'payment.latency', deltaPct: 312 },
      { metric: 'order.error_rate', deltaPct: 180 },
    ],
    changes: [{ at: '2026-10-18T14:30:00.000Z', text: 'payment deployed v4.3.1' }],
    candidates: [
      {
        component: 'payment v4.3.1',
        confidence: confidenceFromScore(0.82),
        score: 0.82,
        why: [
          'payment deployed v4.3.1 2m 18s before incident onset',
          'payment is among the incident’s affected services',
        ],
      },
    ],
  },
  {
    id: 'INC-1043',
    startedAt: '2026-10-20T09:05:00.000Z',
    severity: 'medium',
    affectedServices: ['inventory'],
    timeline: [
      {
        at: '2026-10-20T09:00:00.000Z',
        kind: 'change',
        text: 'inventory config change: db.pool 50 → 20',
      },
      {
        at: '2026-10-20T09:05:00.000Z',
        kind: 'signal',
        text: 'inventory connection-pool exhaustion',
      },
    ],
    signals: [{ metric: 'inventory.pool_wait', deltaPct: 240 }],
    changes: [{ at: '2026-10-20T09:00:00.000Z', text: 'inventory config change: db.pool 50 → 20' }],
    candidates: [
      {
        component: 'inventory',
        confidence: confidenceFromScore(0.55),
        score: 0.55,
        why: ['inventory config change: db.pool 50 → 20 5m before incident onset'],
      },
    ],
  },
];
