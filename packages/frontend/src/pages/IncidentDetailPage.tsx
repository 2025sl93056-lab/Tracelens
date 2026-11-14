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
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="skeleton" style={{ width: 110, height: 13, marginBottom: 28 }} />
      <div className="card" style={{ padding: 'var(--sp-6)', marginBottom: 'var(--sp-5)' }}>
        <div className="skeleton skeleton-title" style={{ width: '40%', marginBottom: 16 }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text" style={{ width: '45%' }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-6)' }}>
          <div className="skeleton skeleton-title" style={{ width: '28%' }} />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  note,
  children,
  style,
}: {
  icon: string;
  title: string;
  note?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={{ marginBottom: 'var(--sp-5)', ...style }}>
      <div className="card-header">
        <div className="section-header" style={{ margin: 0 }}>
          <div className="section-icon">{icon}</div>
          <div>
            <div className="section-title">{title}</div>
            {note && <div className="section-note">{note}</div>}
          </div>
        </div>
      </div>
      <div className="card-body">{children}</div>
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
      <span className="empty-state-icon">🔍</span>
      <div className="empty-state-title">Incident not found</div>
    </div>
  );

  const duration = null;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/incidents')}
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--sp-5)', paddingLeft: 0, gap: 6 }}
      >
        ← Back to Incidents
      </button>

      {/* Header card */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--sp-6)',
          padding: 'var(--sp-7)',
          background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(26,32,53,0.9) 100%)',
          borderColor: 'var(--border-default)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow accent in top-right */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-4)',
            marginBottom: 'var(--sp-5)',
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--text-brand)',
            }}
          >
            {incident.id}
          </h2>
          <SeverityBadge severity={incident.severity} />
        </div>

        {/* Meta row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--sp-5)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              Started
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
              }}
            >
              {new Date(incident.startedAt).toLocaleString()}
            </div>
          </div>

          {duration !== null && (
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                Duration
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                }}
              >
                {duration}m
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              Affected Services
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {incident.affectedServices.map((s) => (
                <code
                  key={s}
                  style={{
                    background: 'rgba(129,140,248,0.1)',
                    border: '1px solid rgba(129,140,248,0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 9px',
                    fontSize: '0.78rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: 'var(--text-brand)',
                  }}
                >
                  {s}
                </code>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              Investigation
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{incident.candidates.length}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>candidates</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{incident.signals.length}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>signals</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <SectionCard
        icon="⏱"
        title="Timeline"
        note={`${incident.timeline.length} events`}
      >
        <Timeline entries={incident.timeline} />
      </SectionCard>

      {/* Evidence */}
      <SectionCard
        icon="📊"
        title="Evidence"
        note={`${incident.signals.length} signals · ${incident.changes.length} changes`}
      >
        <EvidenceExplorer signals={incident.signals} changes={incident.changes} />
      </SectionCard>

      {/* Root cause candidates */}
      <SectionCard
        icon="🔍"
        title="What Changed?"
        note="correlation candidates — not confirmed causes"
      >
        <WhatChanged candidates={incident.candidates} />
      </SectionCard>
    </div>
  );
}
