import { describe, it, expect } from 'vitest';
import type { DependencyGraph } from '@tracelens/shared';
import { computeImpact, downstreamImpact, subgraph, upstreamImpact } from './index.js';

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

describe('subgraph', () => {
  const ids = (g: DependencyGraph) => g.nodes.map((n) => n.id).sort();

  it('includes the seeds plus their one-hop callers and dependencies', () => {
    // order calls payment, payment depends on db → a one-hop view around
    // payment is {order, payment, db}; gateway (two hops away) is excluded.
    const result = subgraph(graph, ['payment'], 1);
    expect(ids(result)).toEqual(['db', 'order', 'payment']);
    expect(result.nodes.some((n) => n.id === 'gateway')).toBe(false);
  });

  it('keeps only edges whose endpoints are both in the subgraph', () => {
    const result = subgraph(graph, ['payment'], 1);
    expect(result.edges).toEqual([
      { from: 'order', to: 'payment', kind: 'CALLS' },
      { from: 'payment', to: 'db', kind: 'DEPENDS_ON' },
    ]);
    // gateway → order is dropped: gateway is not part of this subgraph.
    expect(result.edges.some((e) => e.from === 'gateway')).toBe(false);
  });

  it('hops = 0 returns only the seed nodes and the edges among them', () => {
    expect(subgraph(graph, ['payment'], 0)).toEqual({
      nodes: [{ id: 'payment', kind: 'service', label: 'payment' }],
      edges: [],
    });
  });

  it('grows with the hop count', () => {
    // Two hops from payment reaches gateway (payment ← order ← gateway).
    expect(ids(subgraph(graph, ['payment'], 2))).toEqual(['db', 'gateway', 'order', 'payment']);
  });

  it('ignores seed ids that are not nodes in the graph', () => {
    expect(subgraph(graph, ['does-not-exist'], 1)).toEqual({ nodes: [], edges: [] });
  });

  it('is cycle-safe', () => {
    const cyclic: DependencyGraph = {
      nodes: [
        { id: 'a', kind: 'service', label: 'a' },
        { id: 'b', kind: 'service', label: 'b' },
      ],
      edges: [
        { from: 'a', to: 'b', kind: 'CALLS' },
        { from: 'b', to: 'a', kind: 'CALLS' },
      ],
    };
    const result = subgraph(cyclic, ['a'], 1);
    expect(ids(result)).toEqual(['a', 'b']);
    expect(result.edges).toHaveLength(2);
  });
});
