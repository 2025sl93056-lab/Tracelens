import { useEffect, useState } from 'react';
import type { DependencyGraph, ImpactResult } from '@tracelens/shared';
import { api } from '../api/client.js';
import { DepGraph } from '../components/DepGraph.js';

export function GraphPage() {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [selectedNode, setSelectedNode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    api
      .graph()
      .then(setGraph)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function runImpact() {
    if (!selectedNode) return;
    setImpactLoading(true);
    setImpact(null);
    try {
      const result = await api.impact(selectedNode);
      setImpact(result);
    } catch {
      // impact analysis is best-effort
    } finally {
      setImpactLoading(false);
    }
  }

  if (loading) return <p>Loading graph…</p>;
  if (error) return <p style={{ color: '#f44336' }}>Error: {error}</p>;
  if (!graph) return <p>No graph data.</p>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Service Dependency Graph</h2>
      <DepGraph graph={graph} highlighted={impact?.affected ?? []} />

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>
          Impact analysis from node:
        </label>
        <select
          value={selectedNode}
          onChange={(e) => setSelectedNode(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">— select a node —</option>
          {graph.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
        <button
          onClick={runImpact}
          disabled={!selectedNode || impactLoading}
          style={{
            padding: '6px 14px',
            background: '#1a1a2e',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {impactLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {impact && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3e0', borderRadius: 6 }}>
          <strong>Affected nodes ({impact.affected.length}):</strong>{' '}
          {impact.affected.length === 0
            ? 'none'
            : impact.affected.join(', ')}
        </div>
      )}
    </div>
  );
}
