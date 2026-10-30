import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Incident } from '@tracelens/shared';
import { api } from '../api/client.js';
import { SeverityBadge } from '../components/SeverityBadge.js';
import { Timeline } from '../components/Timeline.js';
import { EvidenceExplorer } from '../components/EvidenceExplorer.js';
import { WhatChanged } from '../components/WhatChanged.js';

function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 24 }} />
      <div className="skeleton skeleton-title" />
      <div className="skeleton" style={{ width: '45%', height: 14, marginBottom: 32 }} />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ marginBottom: 32 }}>
          <div className="skeleton skeleton-title" style={{ width: '30%' }} />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '80%' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .incident(id)
      .then(setIncident)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DetailSkeleton />;
  if (error) return <div className="alert alert-error" style={{ marginTop: 24 }}>⚠ {error}</div>;
  if (!incident) return (
    <div className="empty-state">
      <div className="empty-state-icon">🔍</div>
      <div className="empty-state-title">Incident not found</div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Back */}
      <button
        onClick={() => navigate('/incidents')}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--space-5)', paddingLeft: 0 }}
      >
        ← Back to Incidents
      </button>

      {/* Header */}
      <div
        className="card"
        style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{incident.id}</h2>
          <SeverityBadge severity={incident.severity} />
        </div>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-6)',
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>Started</strong>&nbsp;
            {new Date(incident.startedAt).toLocaleString()}
          </span>
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>Affected</strong>&nbsp;
            {incident.affectedServices.map((s) => (
              <code
                key={s}
                style={{
                  background: 'var(--surface-overlay)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 7px',
                  fontSize: '0.8rem',
                  marginRight: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-brand)',
                }}
              >
                {s}
              </code>
            ))}
          </span>
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>Candidates</strong>&nbsp;
            {incident.candidates.length}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="card section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">⏱</div>
            <div>
              <div className="section-title">Timeline</div>
              <div className="section-note">{incident.timeline.length} events</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <Timeline entries={incident.timeline} />
        </div>
      </div>

      {/* Evidence */}
      <div className="card section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">📊</div>
            <div>
              <div className="section-title">Evidence</div>
              <div className="section-note">
                {incident.signals.length} signals · {incident.changes.length} changes
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <EvidenceExplorer signals={incident.signals} changes={incident.changes} />
        </div>
      </div>

      {/* What Changed */}
      <div className="card section">
        <div className="card-header">
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-icon">🔍</div>
            <div>
              <div className="section-title">What Changed?</div>
              <div className="section-note">correlation candidates — not confirmed causes</div>
            </div>
          </div>
        </div>
        <div className="card-body">
          <WhatChanged candidates={incident.candidates} />
        </div>
      </div>
    </div>
  );
}
