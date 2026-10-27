import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Incident } from '@tracelens/shared';
import { api } from '../api/client.js';
import { SeverityBadge } from '../components/SeverityBadge.js';
import { Timeline } from '../components/Timeline.js';
import { EvidenceExplorer } from '../components/EvidenceExplorer.js';
import { WhatChanged } from '../components/WhatChanged.js';

const section: React.CSSProperties = {
  marginBottom: '2rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #eee',
};

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

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: '#f44336' }}>Error: {error}</p>;
  if (!incident) return <p>Incident not found.</p>;

  return (
    <div>
      <button
        onClick={() => navigate('/incidents')}
        style={{
          background: 'none',
          border: 'none',
          color: '#4a90e2',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
        }}
      >
        ← Back to Incidents
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
        <h2 style={{ margin: 0 }}>{incident.id}</h2>
        <SeverityBadge severity={incident.severity} />
      </div>
      <p style={{ color: '#555', marginTop: 0, marginBottom: '2rem' }}>
        <strong>Started:</strong> {new Date(incident.startedAt).toLocaleString()}
        &nbsp;&nbsp;·&nbsp;&nbsp;
        <strong>Affected:</strong> {incident.affectedServices.join(', ')}
      </p>

      <section style={section}>
        <h3 style={{ marginTop: 0 }}>Timeline</h3>
        <Timeline entries={incident.timeline} />
      </section>

      <section style={section}>
        <h3 style={{ marginTop: 0 }}>Evidence</h3>
        <EvidenceExplorer signals={incident.signals} changes={incident.changes} />
      </section>

      <section style={section}>
        <h3 style={{ marginTop: 0 }}>
          What Changed?{' '}
          <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#888' }}>
            correlation evidence — not confirmed causes
          </span>
        </h3>
        <WhatChanged candidates={incident.candidates} />
      </section>
    </div>
  );
}
