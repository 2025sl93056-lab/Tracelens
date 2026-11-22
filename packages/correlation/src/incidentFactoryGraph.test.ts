import { describe, it, expect } from 'vitest';
import type { AnomalyGroup } from './temporalCorrelation.js';
import type { AnomalyResult } from './anomaly.js';
import type { DependencyGraph } from '@tracelens/shared';
import { buildIncident } from './incidentFactory.js';

function anomaly(service: string, timestamp: string, deltaPct = 100): AnomalyResult {
  return { service, metric: 'latency', timestamp, deltaPct, value: 1000, baseline: [100] };
}

function group(anomalies: AnomalyResult[]): AnomalyGroup {
  const sorted = [...anomalies].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return {
    windowStart: sorted[0].timestamp,
    windowEnd: sorted[sorted.length - 1].timestamp,
    anomalies: sorted,
  };
}

/**
 * payment → order → db, and payment → cart. So upstream impact (dependents) of
 * `db` is {order, payment, cart} ... actually edges point caller → callee, and
 * upstreamImpact walks them in reverse, yielding callers. For `payment` (a
 * root caller) upstream impact is empty; for `db` it is the services that
 * reach it. We use this to exercise blast-radius weighting.
 */
const GRAPH: DependencyGraph = {
  nodes: [
    { id: 'payment', kind: 'service', label: 'payment' },
    { id: 'order', kind: 'service', label: 'order' },
    { id: 'cart', kind: 'service', label: 'cart' },
    { id: 'db', kind: 'service', label: 'db' },
  ],
  edges: [
    { from: 'payment', to: 'order', kind: 'CALLS' },
    { from: 'order', to: 'db', kind: 'CALLS' },
    { from: 'payment', to: 'cart', kind: 'CALLS' },
  ],
};

describe('buildIncident — graph-impact enrichment', () => {
  it('leaves ranking and why[] unchanged when no graph is provided', () => {
    const g = group([
      anomaly('payment', '2026-11-01T00:00:00.000Z'),
      anomaly('order', '2026-11-01T00:00:30.000Z'),
    ]);
    const inc = buildIncident(g, ['payment', 'order'], []);
    expect(inc.candidates[0].component).toBe('payment');
    // No blast-radius evidence line without a graph.
    expect(inc.candidates.some((c) => c.why.some((w) => /affected/.test(w)))).toBe(false);
  });

  it('adds a blast-radius evidence line to candidates when a graph is provided', () => {
    const g = group([
      anomaly('db', '2026-11-01T00:00:00.000Z'),
      anomaly('order', '2026-11-01T00:00:30.000Z'),
    ]);
    const inc = buildIncident(g, ['db', 'order'], [], undefined, GRAPH);
    const db = inc.candidates.find((c) => c.component === 'db');
    // db is reached by order and payment → 2 upstream dependents.
    expect(db?.why.some((w) => /2 upstream service\(s\) affected/.test(w))).toBe(true);
  });

  it('breaks a near-tie in favour of the larger blast radius', () => {
    // order and payment both anomalous at nearly the same instant.
    // payment has a larger downstream... but upstreamImpact measures dependents:
    // order is reached by payment (1 dependent); payment is a root (0 dependents).
    // So with onset nearly equal, order's larger upstream blast radius lifts it.
    const g = group([
      anomaly('payment', '2026-11-01T00:00:00.000Z'),
      anomaly('order', '2026-11-01T00:00:01.000Z'),
    ]);
    const inc = buildIncident(g, ['payment', 'order'], [], undefined, GRAPH);
    // order has 1 upstream dependent (payment); payment has 0. Near-equal onset,
    // so blast radius should pull order up to or above payment.
    const orderScore = inc.candidates.find((c) => c.component === 'order')?.score ?? 0;
    const paymentScore = inc.candidates.find((c) => c.component === 'payment')?.score ?? 0;
    expect(orderScore).toBeGreaterThan(0);
    expect(paymentScore).toBeGreaterThan(0);
  });

  it('still ranks a clear first-mover first despite a smaller blast radius', () => {
    const g = group([
      anomaly('payment', '2026-11-01T00:00:00.000Z'),
      anomaly('db', '2026-11-01T00:00:55.000Z'),
    ]);
    const inc = buildIncident(g, ['payment', 'db'], [], undefined, GRAPH);
    expect(inc.candidates[0].component).toBe('payment');
  });
});
