/**
 * Graph derivation from trace spans (§6.3).
 *
 * OWNER: Member 3 (Dependency Graph & Backend Platform)
 *
 * The dependency graph is not configured by hand — it is *observed*. Every
 * distributed trace is a tree of spans linked by `parentSpanId`; when a span in
 * service A is the parent of a span in service B, A called B. Collapsing those
 * span relationships across many traces yields the service-level call graph:
 *
 *   parent span (service A) ──► child span (service B)   ⇒   A ──CALLS──► B
 *
 * This module turns a stream of {@link TelemetryEvent}s into a
 * {@link DependencyGraph}. Only `trace` events carrying a `spanId` participate;
 * everything else is ignored. The result is deterministic (nodes and edges are
 * sorted) so it is stable to snapshot, diff, and persist.
 */
import type { DependencyGraph, GraphEdge, GraphNode, TelemetryEvent } from '@tracelens/shared';

/** A trace span event: a `trace` telemetry event that carries a `spanId`. */
function isSpan(event: TelemetryEvent): boolean {
  return event.type === 'trace' && typeof event.spanId === 'string' && event.spanId.length > 0;
}

/**
 * Derive the service dependency graph from trace spans.
 *
 * - A `service` node is created for every service that emits at least one span.
 * - A `CALLS` edge `A → B` is created whenever a span in service `A` is the
 *   parent of a span in service `B` (`A !== B`).
 *
 * Within-service spans (parent and child in the same service) and spans whose
 * parent cannot be resolved to a known span are ignored. Duplicate calls across
 * many traces collapse into a single edge.
 *
 * @param events Telemetry stream; only trace spans are considered.
 * @returns A deterministic graph (nodes sorted by id, edges by `from`,`to`).
 */
export function deriveGraphFromSpans(events: readonly TelemetryEvent[]): DependencyGraph {
  // 1. Map every span id to the service that emitted it so a child can look up
  //    which service its parent lived in.
  const spanService = new Map<string, string>();
  for (const event of events) {
    if (isSpan(event)) {
      spanService.set(event.spanId as string, event.service);
    }
  }

  // 2. Collect service nodes and cross-service CALLS edges (both de-duplicated).
  const services = new Set<string>();
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const event of events) {
    if (!isSpan(event)) continue;
    services.add(event.service);

    const parentSpanId = event.parentSpanId;
    if (parentSpanId === undefined) continue;

    const parentService = spanService.get(parentSpanId);
    if (parentService === undefined) continue; // unresolved / root span of another service
    if (parentService === event.service) continue; // internal span, not a service call

    const key = `${parentService}\u0000${event.service}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push({ from: parentService, to: event.service, kind: 'CALLS' });
  }

  const nodes: GraphNode[] = [...services].map((service) => ({
    id: service,
    kind: 'service',
    label: service,
  }));

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  return { nodes, edges };
}
