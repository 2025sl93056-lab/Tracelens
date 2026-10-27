import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DependencyGraph, NodeKind } from '@tracelens/shared';

const KIND_COLOR: Record<NodeKind, string> = {
  service: '#4a90e2',
  database: '#7b68ee',
  api: '#50c878',
  deployment: '#ff9800',
  incident: '#f44336',
  alert: '#ff5722',
};

function gridLayout(count: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  return (i: number) => ({ x: (i % cols) * 220, y: Math.floor(i / cols) * 110 });
}

function toFlow(graph: DependencyGraph, highlighted: string[]) {
  const pos = gridLayout(graph.nodes.length);
  const nodes: Node[] = graph.nodes.map((n, i) => ({
    id: n.id,
    data: { label: n.label },
    position: pos(i),
    style: {
      background: highlighted.includes(n.id) ? '#fff3e0' : '#fff',
      border: `2px solid ${KIND_COLOR[n.kind]}`,
      borderRadius: 6,
      padding: '6px 12px',
      fontWeight: highlighted.includes(n.id) ? 700 : 400,
      fontSize: '0.85rem',
    },
  }));
  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    label: e.kind,
    labelStyle: { fontSize: '0.7rem', fill: '#888' },
    style: { stroke: '#bbb' },
  }));
  return { nodes, edges };
}

export function DepGraph({
  graph,
  highlighted = [],
}: {
  graph: DependencyGraph;
  highlighted?: string[];
}) {
  const { nodes, edges } = toFlow(graph, highlighted);
  return (
    <div style={{ height: 500, border: '1px solid #e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
