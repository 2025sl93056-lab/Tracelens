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
      setImpact(await api.impact(selectedNode));
    } catch {
      // best-effort
    } finally {
      setImpactLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Service Graph</h1>
            <p className="page-subtitle">Live dependency map with impact analysis</p>
          </div>
        </div>
        <div className="card">
          <div
            className="skeleton"
            style={{ height: 500, borderRadius: 'var(--radius-lg)', margin: 1 }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error" style={{ marginTop: 24 }}>⚠ {error}</div>;
  }

  if (!graph) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🕸️</span>
        <div className="empty-state-title">No graph data available</div>
      </div>
    );
  }

  const nodeKindCounts = graph.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.kind] = (acc[n.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Service Graph</h1>
          <p className="page-subtitle">
            {graph.nodes.length} nodes · {graph.edges.length} edges
            {impact ? ` · ${impact.affected.length} impacted by ${selectedNode}` : ''}
          </p>
        </div>
      </div>

      {/* Legend + stats row */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--sp-3)',
          marginBottom: 'var(--sp-5)',
          flexWrap: 'wrap',
        }}
      >
        {Object.entries(nodeKindCounts).map(([kind, count]) => (
          <div
            key={kind}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  kind === 'service' ? '#3b82f6' :
                  kind === 'database' ? '#8b5cf6' :
                  kind === 'api' ? '#22c55e' :
                  kind === 'deployment' ? '#f97316' :
                  kind === 'incident' ? '#ef4444' :
                  '#f97316',
                flexShrink: 0,
              }}
            />
            {count} {kind}{count !== 1 ? 's' : ''}
          </div>
        ))}
      </div>

      {/* Graph canvas */}
      <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">🕸️</div>
            <div>
              <div className="section-title">Dependency Map</div>
              <div className="section-note">
                {impact
                  ? `${impact.affected.length} nodes affected downstream from ${selectedNode}`
                  : 'Scroll to zoom · drag to pan · click a node to explore'}
              </div>
            </div>
          </div>
          {impact && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setImpact(null); setSelectedNode(''); }}
            >
              ✕ Clear
            </button>
          )}
        </div>
        <div style={{ padding: 'var(--sp-3)' }}>
          <DepGraph graph={graph} highlighted={impact?.affected ?? []} />
        </div>
      </div>

      {/* Impact analysis */}
      <div className="card">
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">💥</div>
            <div>
              <div className="section-title">Impact Analysis</div>
              <div className="section-note">Simulate a node failure and trace downstream effects</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-3)',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBottom: impact ? 'var(--sp-4)' : 0,
            }}
          >
            <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Simulate failure at node</label>
              <select
                className="form-select"
                value={selectedNode}
                onChange={(e) => {
                  setSelectedNode(e.target.value);
                  setImpact(null);
                }}
              >
                <option value="">— select a node —</option>
                {graph.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.kind})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runImpact}
              disabled={!selectedNode || impactLoading}
              className="btn btn-primary"
              style={{ height: 42, minWidth: 160 }}
            >
              {impactLoading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Analyzing…
                </>
              ) : (
                '⚡ Analyze Impact'
              )}
            </button>
          </div>

          {impact && (
            <div className="impact-result">
              <div className="impact-label">
                {impact.affected.length === 0
                  ? '✓ No downstream impact'
                  : `⚡ ${impact.affected.length} node${impact.affected.length > 1 ? 's' : ''} affected`}
              </div>
              {impact.affected.length > 0 && (
                <div className="impact-chips">
                  {impact.affected.map((n) => (
                    <span key={n} className="impact-chip">{n}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
