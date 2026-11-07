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
  ImpactDirection,
  ImpactResult,
  Incident,
  IncidentListResponse,
  IncidentSummary,
  Severity,
  TelemetryEvent,
} from '@tracelens/shared';
import { computeImpact, deriveGraphFromSpans } from '@tracelens/graph';
import { SEED_INCIDENTS, SEED_TRACE_SPANS, buildSeedGraph } from './seed.js';

/** Read model the API serves. Implementations may be in-memory or Postgres. */
export interface DataStore {
  /** Compact incidents for the list view (`GET /incidents`). */
  listIncidents(): IncidentSummary[];
  /** Paginated + filtered incident list. */
  listIncidentsPaginated(opts: {
    limit: number;
    offset: number;
    severity?: Severity;
    status?: 'open' | 'resolved';
  }): IncidentListResponse;
  /** Full incident by id (`GET /incidents/:id`), or `undefined` if unknown. */
  getIncident(id: string): Incident | undefined;
  /** Service nodes (`GET /services`). */
  listServices(): GraphNode[];
  /** The dependency graph (`GET /graph`). */
  getGraph(): DependencyGraph;
  /** Impact from a node (`GET /graph/impact?node=&direction=`). Defaults to downstream. */
  getImpact(node: string, direction?: ImpactDirection): ImpactResult;
  /** Re-derive the graph from trace spans (admin maintenance). */
  rebuildGraph(spans?: readonly TelemetryEvent[]): DependencyGraph;
}

/** Project a full {@link Incident} down to its {@link IncidentSummary}. */
function toSummary(incident: Incident): IncidentSummary {
  return {
    id: incident.id,
    startedAt: incident.startedAt,
    severity: incident.severity,
    status: incident.status,
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

  listIncidentsPaginated(opts: {
    limit: number;
    offset: number;
    severity?: Severity;
    status?: 'open' | 'resolved';
  }): IncidentListResponse {
    let all = [...this.incidents.values()].sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    );
    if (opts.severity !== undefined) {
      all = all.filter((i) => i.severity === opts.severity);
    }
    if (opts.status !== undefined) {
      all = all.filter((i) => i.status === opts.status);
    }
    const total = all.length;
    const items = all.slice(opts.offset, opts.offset + opts.limit).map(toSummary);
    return { items, total, limit: opts.limit, offset: opts.offset };
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

  getImpact(node: string, direction?: ImpactDirection): ImpactResult {
    return computeImpact(this.graph, node, direction);
  }

  rebuildGraph(spans: readonly TelemetryEvent[] = SEED_TRACE_SPANS): DependencyGraph {
    this.graph = deriveGraphFromSpans(spans);
    return this.graph;
  }
}
