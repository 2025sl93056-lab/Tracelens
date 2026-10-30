import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IncidentSummary } from '@tracelens/shared';
import { api } from '../api/client.js';
import { SeverityBadge } from '../components/SeverityBadge.js';

function IncidentSkeleton() {
  return (
    <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto auto',
            gap: 'var(--space-4)',
            padding: 'var(--space-4) 0',
            borderBottom: '1px solid var(--border-subtle)',
            alignItems: 'center',
          }}
        >
          <div className="skeleton skeleton-text" style={{ width: 80 }} />
          <div>
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 4 }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: 60 }} />
          <div className="skeleton skeleton-text" style={{ width: 80 }} />
        </div>
      ))}
    </div>
  );
}

export function IncidentListPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .incidents()
      .then(setIncidents)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    critical: incidents.filter((i) => i.severity === 'critical').length,
    high: incidents.filter((i) => i.severity === 'high').length,
    medium: incidents.filter((i) => i.severity === 'medium').length,
    low: incidents.filter((i) => i.severity === 'low').length,
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Incidents</h1>
          <p className="page-subtitle">Active and recent incidents across all services</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => location.reload()}>
          ↻&nbsp; Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Incidents</div>
            <div className="stat-value">{incidents.length}</div>
            <div className="stat-sub">all time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Critical</div>
            <div className={`stat-value ${counts.critical > 0 ? 'critical' : ''}`}>{counts.critical}</div>
            <div className="stat-sub">requires immediate action</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High</div>
            <div className={`stat-value ${counts.high > 0 ? 'high' : ''}`}>{counts.high}</div>
            <div className="stat-sub">elevated severity</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Medium / Low</div>
            <div className="stat-value" style={{ color: 'var(--color-medium)' }}>
              {counts.medium + counts.low}
            </div>
            <div className="stat-sub">monitoring</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            All Incidents
          </span>
          {!loading && (
            <span
              style={{
                background: 'var(--surface-overlay)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '2px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
              {incidents.length} total
            </span>
          )}
        </div>

        {loading ? (
          <IncidentSkeleton />
        ) : error ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <div className="alert alert-error">⚠ {error}</div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">No incidents found</div>
            <div className="empty-state-desc">All systems are operating normally.</div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '130px 1fr auto auto',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-5)',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
              }}
            >
              {['Incident ID', 'Details', 'Severity', 'Started'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {incidents.map((inc, i) => (
              <div
                key={inc.id}
                className="incident-row"
                onClick={() => navigate(`/incidents/${inc.id}`)}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="incident-id">{inc.id}</div>
                <div className="incident-meta">
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      marginBottom: 2,
                    }}
                  >
                    {inc.affectedServices.length === 1
                      ? `${inc.affectedServices[0]} affected`
                      : `${inc.affectedServices.length} services affected`}
                  </div>
                  <div className="incident-services">{inc.affectedServices.join(' · ')}</div>
                </div>
                <SeverityBadge severity={inc.severity} />
                <div className="incident-time">{new Date(inc.startedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
