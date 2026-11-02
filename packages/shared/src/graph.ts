/**
 * Dependency graph contracts (§6.3).
 *
 * Produced by: graph service (Member 3)
 * Consumed by: correlation/impact (Member 2), frontend (Member 4)
 */

/** Node kinds in the incident knowledge graph. */
export type NodeKind = 'service' | 'database' | 'api' | 'deployment' | 'incident' | 'alert';

/** Edge kinds relating nodes. */
export type EdgeKind =
  | 'CALLS'
  | 'DEPENDS_ON'
  | 'DEPLOYED'
  | 'CHANGED_BY'
  | 'AFFECTS'
  | 'CORRELATED_WITH';

export interface GraphNode {
  /** Stable node id, e.g. "svc:payment-service". */
  id: string;
  kind: NodeKind;
  label: string;
  attributes?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  kind: EdgeKind;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Direction an impact traversal follows over the dependency graph.
 *
 * - `downstream` — nodes the start node reaches by following edges
 *   (its dependencies: "what does this node rely on?").
 * - `upstream` — nodes that reach the start node by following edges in reverse
 *   (its dependents/callers: "who is affected if this node degrades?").
 */
export type ImpactDirection = 'downstream' | 'upstream';

/** Result of impact analysis: components reachable/affected from a node. */
export interface ImpactResult {
  /** The node impact was computed from. */
  node: string;
  /** Direction the traversal followed. Defaults to `downstream`. */
  direction?: ImpactDirection;
  /** Affected node ids (dependencies when downstream, dependents when upstream). */
  affected: string[];
}
