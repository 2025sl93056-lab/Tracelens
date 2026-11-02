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
 * `downstreamImpact` / `upstreamImpact` below are a working starting point
 * (direction-aware BFS over the graph), already unit-tested, that Member 2's
 * ranking can use immediately. `deriveGraphFromSpans` (in ./deriveGraph.ts)
 * builds the graph from traces.
 */
import type { DependencyGraph, ImpactDirection, ImpactResult } from '@tracelens/shared';

export * from './deriveGraph.js';

/**
 * Breadth-first impact traversal from `start`, returning all reachable node ids
 * (excluding the start itself). Cycle-safe.
 *
 * The `direction` decides which way edges are followed:
 *   - `downstream` (default) follows edges `from → to`, yielding what the start
 *     node depends on ("what does this node rely on?").
 *   - `upstream` follows edges in reverse `to → from`, yielding the start node's
 *     dependents/callers ("who is affected if this node degrades?") — the
 *     blast-radius view an incident investigation usually wants.
 */
export function computeImpact(
  graph: DependencyGraph,
  start: string,
  direction: ImpactDirection = 'downstream',
): ImpactResult {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    // For upstream traversal we walk the graph backwards.
    const from = direction === 'downstream' ? edge.from : edge.to;
    const to = direction === 'downstream' ? edge.to : edge.from;
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  }

  const visited = new Set<string>();
  const queue = [...(adjacency.get(start) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (visited.has(node) || node === start) continue;
    visited.add(node);
    queue.push(...(adjacency.get(node) ?? []));
  }

  return { node: start, direction, affected: [...visited] };
}

/**
 * Downstream impact: everything the `start` node reaches by following edges
 * (its transitive dependencies). Cycle-safe.
 */
export function downstreamImpact(graph: DependencyGraph, start: string): ImpactResult {
  return computeImpact(graph, start, 'downstream');
}

/**
 * Upstream impact: everything that reaches the `start` node (its transitive
 * dependents/callers) — i.e. the services affected if `start` degrades.
 * Cycle-safe.
 */
export function upstreamImpact(graph: DependencyGraph, start: string): ImpactResult {
  return computeImpact(graph, start, 'upstream');
}
