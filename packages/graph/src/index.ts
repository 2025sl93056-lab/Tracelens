/**
 * graph — the service dependency graph and impact analysis.
 *
 * OWNER: Member 3 (Dependency Graph & Backend Platform)
 *
 * GOAL: derive CALLS/DEPENDS_ON edges from trace spans, store/serve the graph,
 * and compute impact (what is downstream/affected from a node) to feed the
 * incident engine and the dashboard.
 *
 * TODO (issue + PR per item):
 *  - [x] Derive edges from TelemetryEvent traces (parent span -> child span = CALLS).
 *  - [ ] Persist the graph (PostgreSQL adjacency) and expose a query API.
 *  - [ ] Layer in DEPLOYED / CHANGED_BY / AFFECTS edges.
 *  - [ ] Expose impact analysis through the core API.
 *
 * `downstreamImpact` below is a working starting point (BFS over the graph),
 * already unit-tested, that Member 2's ranking can use immediately.
 * `deriveGraphFromSpans` (in ./deriveGraph.ts) builds the graph from traces.
 */
import type { DependencyGraph, ImpactResult } from '@tracelens/shared';

export * from './deriveGraph.js';

/**
 * Breadth-first traversal from `start`, returning all reachable node ids
 * (excluding the start itself). Cycle-safe.
 */
export function downstreamImpact(graph: DependencyGraph, start: string): ImpactResult {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  const visited = new Set<string>();
  const queue = [...(adjacency.get(start) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (visited.has(node) || node === start) continue;
    visited.add(node);
    queue.push(...(adjacency.get(node) ?? []));
  }

  return { node: start, affected: [...visited] };
}
