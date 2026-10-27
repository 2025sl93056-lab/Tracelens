import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { IncidentSummary } from '@tracelens/shared';
import { api } from '../api/client.js';
import { SeverityBadge } from '../components/SeverityBadge.js';

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 14px',
  borderBottom: '2px solid #eee',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#555',
};
const td: React.CSSProperties = { padding: '11px 14px' };

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

  if (loading) return <p>Loading incidents…</p>;
  if (error) return <p style={{ color: '#f44336' }}>Error: {error}</p>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Incidents</h2>
      {incidents.length === 0 ? (
        <p style={{ color: '#888' }}>No incidents found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Started</th>
              <th style={th}>Severity</th>
              <th style={th}>Affected Services</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f7')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <td style={td}>
                  <code style={{ fontWeight: 600 }}>{inc.id}</code>
                </td>
                <td style={{ ...td, color: '#555' }}>
                  {new Date(inc.startedAt).toLocaleString()}
                </td>
                <td style={td}>
                  <SeverityBadge severity={inc.severity} />
                </td>
                <td style={{ ...td, color: '#555' }}>{inc.affectedServices.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
