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
          <div className="skeleton" style={{ height: 480, borderRadius: 'var(--radius-lg)', margin: '1px' }} />
        </div>
      </div>
    );
  }

  if (error) return <div className="alert alert-error" style={{ marginTop: 24 }}>⚠ {error}</div>;
  if (!graph) return <div className="empty-state"><div className="empty-state-icon">🕸️</div><div className="empty-state-title">No graph data available</div></div>;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Service Graph</h1>
          <p className="page-subtitle">
            {graph.nodes.length} nodes · {graph.edges.length} edges
          </p>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">🕸️</div>
            <div>
              <div className="section-title">Dependency Map</div>
              <div className="section-note">
                {impact ? `${impact.affected.length} nodes affected by ${selectedNode}` : 'Select a node for impact analysis'}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: 'var(--space-4)' }}>
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
              <div className="section-note">Simulate a node failure and see downstream effects</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBottom: impact ? 'var(--space-4)' : 0,
            }}
          >
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Simulate failure at</label>
              <select
                className="form-select"
                value={selectedNode}
                onChange={(e) => { setSelectedNode(e.target.value); setImpact(null); }}
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
              style={{ height: 42 }}
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
            <div className="impact-result" style={{ animation: 'fadeIn 0.2s ease' }}>
              <div className="impact-label">
                {impact.affected.length === 0
                  ? '✓ No downstream impact'
                  : `⚡ ${impact.affected.length} nodes affected`}
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
