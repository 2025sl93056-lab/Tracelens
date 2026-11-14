import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DependencyGraph, NodeKind } from '@tracelens/shared';

const KIND_COLOR: Record<NodeKind, { bg: string; border: string; text: string }> = {
  service:    { bg: '#1e2d4a', border: '#3b82f6', text: '#93c5fd' },
  database:   { bg: '#2a1e4a', border: '#8b5cf6', text: '#c4b5fd' },
  api:        { bg: '#1e3a2a', border: '#22c55e', text: '#86efac' },
  deployment: { bg: '#3a2a1e', border: '#f97316', text: '#fdba74' },
  incident:   { bg: '#3a1e1e', border: '#ef4444', text: '#fca5a5' },
  alert:      { bg: '#3a2a1e', border: '#f97316', text: '#fdba74' },
};

function gridLayout(count: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  return (i: number) => ({ x: (i % cols) * 240, y: Math.floor(i / cols) * 120 });
}

function toFlow(graph: DependencyGraph, highlighted: string[]) {
  const pos = gridLayout(graph.nodes.length);
  const nodes: Node[] = graph.nodes.map((n, i) => {
    const colors = KIND_COLOR[n.kind];
    const isHighlighted = highlighted.includes(n.id);
    return {
      id: n.id,
      data: { label: n.label },
      position: pos(i),
      style: {
        background: isHighlighted ? 'rgba(234, 179, 8, 0.15)' : colors.bg,
        border: `2px solid ${isHighlighted ? '#eab308' : colors.border}`,
        borderRadius: 8,
        padding: '8px 14px',
        color: isHighlighted ? '#fde047' : colors.text,
        fontWeight: isHighlighted ? 700 : 500,
        fontSize: '0.8rem',
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: isHighlighted
          ? '0 0 16px rgba(234,179,8,0.4)'
          : `0 2px 8px rgba(0,0,0,0.4)`,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    label: e.kind,
    labelStyle: { fontSize: '0.65rem', fill: '#64748b', fontFamily: "'JetBrains Mono', monospace" },
    labelBgStyle: { fill: '#1a2035', fillOpacity: 0.9 },
    style: { stroke: '#334155', strokeWidth: 1.5 },
    animated: e.kind === 'CALLS',
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
    <div
      style={{
        height: 460,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: '#0d1120',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
      >
        <Background color="#1e2538" gap={24} />
        <Controls
          style={{
            background: 'var(--surface-overlay)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        />
        <MiniMap
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
          nodeColor={(n) => {
            if (highlighted.includes(n.id)) return '#eab308';
            const kind = (n as any).data?.kind as NodeKind ?? 'service';
            return KIND_COLOR[kind]?.border ?? '#3b82f6';
          }}
        />
      </ReactFlow>
    </div>
  );
}
