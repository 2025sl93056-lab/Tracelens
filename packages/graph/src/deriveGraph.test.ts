import { describe, it, expect } from 'vitest';
import type { TelemetryEvent } from '@tracelens/shared';
import { deriveGraphFromSpans, downstreamImpact } from './index.js';

/**
 * A single trace through the demo call chain:
 *   gateway → order → payment → db-sim
 *                └──→ inventory
 * Each hop is a span whose `parentSpanId` points at the caller's span.
 */
function sampleSpans(): TelemetryEvent[] {
  const ts = '2026-10-18T14:32:18.000Z';
  const span = (service: string, spanId: string, parentSpanId?: string): TelemetryEvent => ({
    type: 'trace',
    service,
    timestamp: ts,
    name: 'http.server',
    traceId: 'trace-1',
    spanId,
    ...(parentSpanId ? { parentSpanId } : {}),
  });

  return [
    span('gateway', 's1'),
    span('order', 's2', 's1'),
    span('payment', 's3', 's2'),
    span('inventory', 's4', 's2'),
    span('db-sim', 's5', 's3'),
  ];
}

describe('deriveGraphFromSpans', () => {
  it('creates a service node for every service that emits a span', () => {
    const { nodes } = deriveGraphFromSpans(sampleSpans());
    expect(nodes.map((n) => n.id)).toEqual(['db-sim', 'gateway', 'inventory', 'order', 'payment']);
    expect(nodes.every((n) => n.kind === 'service')).toBe(true);
    expect(nodes.every((n) => n.label === n.id)).toBe(true);
  });

  it('derives CALLS edges from parent → child spans', () => {
    const { edges } = deriveGraphFromSpans(sampleSpans());
    expect(edges).toEqual([
      { from: 'gateway', to: 'order', kind: 'CALLS' },
      { from: 'order', to: 'inventory', kind: 'CALLS' },
      { from: 'order', to: 'payment', kind: 'CALLS' },
      { from: 'payment', to: 'db-sim', kind: 'CALLS' },
    ]);
  });

  it('feeds impact analysis end-to-end', () => {
    const graph = deriveGraphFromSpans(sampleSpans());
    expect(downstreamImpact(graph, 'order').affected.sort()).toEqual([
      'db-sim',
      'inventory',
      'payment',
    ]);
  });

  it('de-duplicates repeated calls across many traces', () => {
    const spans = [...sampleSpans(), ...sampleSpans()]; // same chain observed twice
    const { edges } = deriveGraphFromSpans(spans);
    const calls = edges.filter((e) => e.from === 'gateway' && e.to === 'order');
    expect(calls).toHaveLength(1);
  });

  it('ignores within-service spans (no self-edges)', () => {
    const ts = '2026-10-18T14:32:18.000Z';
    const spans: TelemetryEvent[] = [
      { type: 'trace', service: 'order', timestamp: ts, name: 'http.server', spanId: 'a' },
      // a nested internal span inside the same service
      {
        type: 'trace',
        service: 'order',
        timestamp: ts,
        name: 'db.query',
        spanId: 'b',
        parentSpanId: 'a',
      },
    ];
    const { nodes, edges } = deriveGraphFromSpans(spans);
    expect(nodes.map((n) => n.id)).toEqual(['order']);
    expect(edges).toEqual([]);
  });

  it('ignores non-trace events and spans with an unresolved parent', () => {
    const ts = '2026-10-18T14:32:18.000Z';
    const spans: TelemetryEvent[] = [
      { type: 'metric', service: 'gateway', timestamp: ts, name: 'http.latency.ms', value: 5 },
      // child references a parent span that was never emitted
      {
        type: 'trace',
        service: 'order',
        timestamp: ts,
        name: 'http.server',
        spanId: 'child',
        parentSpanId: 'missing',
      },
    ];
    const { nodes, edges } = deriveGraphFromSpans(spans);
    expect(nodes.map((n) => n.id)).toEqual(['order']);
    expect(edges).toEqual([]);
  });

  it('returns an empty graph for an empty stream', () => {
    expect(deriveGraphFromSpans([])).toEqual({ nodes: [], edges: [] });
  });
});
