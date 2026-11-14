import { describe, it, expect } from 'vitest';
import type { DependencyGraph } from '@tracelens/shared';
import { computeImpact, downstreamImpact, upstreamImpact } from './index.js';

const graph: DependencyGraph = {
  nodes: [
    { id: 'gateway', kind: 'service', label: 'gateway' },
    { id: 'order', kind: 'service', label: 'order' },
    { id: 'payment', kind: 'service', label: 'payment' },
    { id: 'db', kind: 'database', label: 'db' },
  ],
  edges: [
    { from: 'gateway', to: 'order', kind: 'CALLS' },
    { from: 'order', to: 'payment', kind: 'CALLS' },
    { from: 'payment', to: 'db', kind: 'DEPENDS_ON' },
  ],
};

describe('downstreamImpact', () => {
  it('returns everything reachable from a node', () => {
    const result = downstreamImpact(graph, 'order');
    expect(result.node).toBe('order');
    expect(result.direction).toBe('downstream');
    expect(result.affected.sort()).toEqual(['db', 'payment']);
  });

  it('returns empty for a leaf node', () => {
    expect(downstreamImpact(graph, 'db').affected).toEqual([]);
  });

  it('is cycle-safe and excludes the start node', () => {
    const cyclic: DependencyGraph = {
      nodes: graph.nodes,
      edges: [
        { from: 'a', to: 'b', kind: 'CALLS' },
        { from: 'b', to: 'a', kind: 'CALLS' },
      ],
    };
    // 'a' reaches 'b'; the cycle back to 'a' must not loop forever, and the
    // start node is not counted as affected by itself.
    expect(downstreamImpact(cyclic, 'a').affected).toEqual(['b']);
  });
});

describe('upstreamImpact', () => {
  it('returns the dependents/callers that reach a node', () => {
    // payment is called (transitively) by order and gateway; db is downstream
    // of payment and must NOT appear in its upstream set.
    const result = upstreamImpact(graph, 'payment');
    expect(result.node).toBe('payment');
    expect(result.direction).toBe('upstream');
    expect(result.affected.sort()).toEqual(['gateway', 'order']);
  });

  it('returns the full caller chain for a leaf (the whole blast radius)', () => {
    // Everything that transitively reaches the database is affected if it fails.
    expect(upstreamImpact(graph, 'db').affected.sort()).toEqual(['gateway', 'order', 'payment']);
  });

  it('returns empty for a root node with no callers', () => {
    expect(upstreamImpact(graph, 'gateway').affected).toEqual([]);
  });

  it('is cycle-safe and excludes the start node', () => {
    const cyclic: DependencyGraph = {
      nodes: graph.nodes,
      edges: [
        { from: 'a', to: 'b', kind: 'CALLS' },
        { from: 'b', to: 'a', kind: 'CALLS' },
      ],
    };
    expect(upstreamImpact(cyclic, 'a').affected).toEqual(['b']);
  });
});

describe('computeImpact', () => {
  it('defaults to downstream when no direction is given', () => {
    expect(computeImpact(graph, 'order')).toEqual(downstreamImpact(graph, 'order'));
  });

  it('follows the requested direction', () => {
    expect(computeImpact(graph, 'payment', 'upstream').affected.sort()).toEqual([
      'gateway',
      'order',
    ]);
    expect(computeImpact(graph, 'payment', 'downstream').affected.sort()).toEqual(['db']);
  });
});
