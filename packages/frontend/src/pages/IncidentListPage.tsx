import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IncidentSummary } from '@tracelens/shared';
import { api } from '../api/client.js';
import { SeverityBadge } from '../components/SeverityBadge.js';

function IncidentSkeleton() {
  return (
    <div style={{ padding: 'var(--sp-5) var(--sp-6)' }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr auto auto',
            gap: 'var(--sp-4)',
            padding: 'var(--sp-4) 0',
            borderBottom: '1px solid var(--border-subtle)',
            alignItems: 'center',
          }}
        >
          <div className="skeleton skeleton-text" style={{ width: 100 }} />
          <div>
            <div className="skeleton skeleton-text" style={{ width: '55%' }} />
            <div className="skeleton skeleton-text" style={{ width: '35%', marginTop: 6 }} />
          </div>
          <div className="skeleton skeleton-text" style={{ width: 72 }} />
          <div className="skeleton skeleton-text" style={{ width: 110 }} />
        </div>
      ))}
    </div>
  );
}

export function IncidentListPage() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSev, setFilterSev] = useState<string>('all');
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
    high:     incidents.filter((i) => i.severity === 'high').length,
    medium:   incidents.filter((i) => i.severity === 'medium').length,
    low:      incidents.filter((i) => i.severity === 'low').length,
  };

  const filtered = incidents.filter((inc) => {
    const matchSev = filterSev === 'all' || inc.severity === filterSev;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      inc.id.toLowerCase().includes(q) ||
      inc.affectedServices.some((s) => s.toLowerCase().includes(q));
    return matchSev && matchSearch;
  });

  const statCards = [
    {
      label: 'Total',
      value: incidents.length,
      sub: 'all incidents',
      cls: '',
      icon: '📋',
      delay: '0s',
    },
    {
      label: 'Critical',
      value: counts.critical,
      sub: 'immediate action',
      cls: counts.critical > 0 ? 'critical' : '',
      icon: '🔴',
      delay: '0.06s',
    },
    {
      label: 'High',
      value: counts.high,
      sub: 'elevated severity',
      cls: counts.high > 0 ? 'high' : '',
      icon: '🟠',
      delay: '0.12s',
    },
    {
      label: 'Med · Low',
      value: counts.medium + counts.low,
      sub: 'monitoring',
      cls: '',
      icon: '🟡',
      delay: '0.18s',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Incidents</h1>
          <p className="page-subtitle">Active and recent incidents across all services</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setLoading(true); api.incidents().then(setIncidents).finally(() => setLoading(false)); }}
          style={{ gap: 6 }}
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.4s', ...(loading ? { animation: 'spin 0.8s linear infinite' } : {}) }}>↻</span>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      {!loading && !error && (
        <div className="stats-grid">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{ animationDelay: s.delay }}
              onClick={() => setFilterSev(s.label === 'Total' ? 'all' : s.label.toLowerCase().split(' ')[0])}
            >
              <div className="stat-label">
                <span>{s.icon}</span>
                {s.label}
              </div>
              <div className={`stat-value ${s.cls}`}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table card */}
      <div className="card">
        {/* Card header with search + filter */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              All Incidents
            </span>
            {!loading && (
              <span className="count-pill">{incidents.length} total</span>
            )}
          </div>

          {!loading && !error && incidents.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div className="search-bar" style={{ width: 200 }}>
                <span className="search-bar-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search incidents…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Severity filter */}
              <select
                className="form-select"
                style={{ width: 140, padding: '6px 36px 6px 12px' }}
                value={filterSev}
                onChange={(e) => setFilterSev(e.target.value)}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <IncidentSkeleton />
        ) : error ? (
          <div style={{ padding: 'var(--sp-6)' }}>
            <div className="alert alert-error">⚠ {error}</div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">✅</span>
            <div className="empty-state-title">No incidents</div>
            <div className="empty-state-desc">All systems are operating normally.</div>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '150px 1fr auto auto',
                gap: 'var(--sp-4)',
                padding: 'var(--sp-3) var(--sp-6)',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.015)',
              }}
            >
              {['Incident ID', 'Affected Services', 'Severity', 'Started'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-12) var(--sp-6)' }}>
                <span className="empty-state-icon">🔍</span>
                <div className="empty-state-title">No matches</div>
                <div className="empty-state-desc">Try adjusting your search or filter.</div>
              </div>
            ) : (
              filtered.map((inc, i) => (
                <div
                  key={inc.id}
                  className="incident-row"
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  style={{ animationDelay: `${i * 0.04}s`, animation: 'fadeIn 0.25s ease both' }}
                >
                  <div>
                    <span className="incident-id">{inc.id}</span>
                  </div>
                  <div className="incident-meta">
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
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
                  <div className="incident-time">
                    {new Date(inc.startedAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
