/**
 * Data store abstraction for the core API (M3).
 *
 * The API is written against the {@link DataStore} interface so the backing
 * store can evolve from the seeded in-memory implementation shipped here to a
 * Postgres-backed one (via {@link createPool}) without touching the routes.
 *
 * All returned shapes are `@tracelens/shared` contracts.
 */
import type {
  DependencyGraph,
  GraphNode,
  ImpactResult,
  Incident,
  IncidentSummary,
  TelemetryEvent,
} from '@tracelens/shared';
import { deriveGraphFromSpans, downstreamImpact } from '@tracelens/graph';
import { SEED_INCIDENTS, SEED_TRACE_SPANS, buildSeedGraph } from './seed.js';

/** Read model the API serves. Implementations may be in-memory or Postgres. */
export interface DataStore {
  /** Compact incidents for the list view (`GET /incidents`). */
  listIncidents(): IncidentSummary[];
  /** Full incident by id (`GET /incidents/:id`), or `undefined` if unknown. */
  getIncident(id: string): Incident | undefined;
  /** Service nodes (`GET /services`). */
  listServices(): GraphNode[];
  /** The dependency graph (`GET /graph`). */
  getGraph(): DependencyGraph;
  /** Downstream impact from a node (`GET /graph/impact?node=`). */
  getImpact(node: string): ImpactResult;
  /** Re-derive the graph from trace spans (admin maintenance). */
  rebuildGraph(spans?: readonly TelemetryEvent[]): DependencyGraph;
}

/** Project a full {@link Incident} down to its {@link IncidentSummary}. */
function toSummary(incident: Incident): IncidentSummary {
  return {
    id: incident.id,
    startedAt: incident.startedAt,
    severity: incident.severity,
    affectedServices: incident.affectedServices,
  };
}

/**
 * In-memory {@link DataStore} seeded with the demo dataset. Deterministic and
 * database-free, so it powers both local dev and the test suite.
 */
export class InMemoryDataStore implements DataStore {
  private readonly incidents: Map<string, Incident>;
  private graph: DependencyGraph;

  constructor(
    incidents: readonly Incident[] = SEED_INCIDENTS,
    graph: DependencyGraph = buildSeedGraph(),
  ) {
    this.incidents = new Map(incidents.map((i) => [i.id, i]));
    this.graph = graph;
  }

  listIncidents(): IncidentSummary[] {
    return [...this.incidents.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map(toSummary);
  }

  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  listServices(): GraphNode[] {
    return this.graph.nodes.filter((n) => n.kind === 'service');
  }

  getGraph(): DependencyGraph {
    return this.graph;
  }

  getImpact(node: string): ImpactResult {
    return downstreamImpact(this.graph, node);
  }

  rebuildGraph(spans: readonly TelemetryEvent[] = SEED_TRACE_SPANS): DependencyGraph {
    this.graph = deriveGraphFromSpans(spans);
    return this.graph;
  }
}
