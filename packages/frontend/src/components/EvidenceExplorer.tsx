import type { Signal, ChangeEvent } from '@tracelens/shared';

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 12px',
  borderBottom: '2px solid #eee',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#555',
};
const td: React.CSSProperties = { padding: '8px 12px' };

export function EvidenceExplorer({
  signals,
  changes,
}: {
  signals: Signal[];
  changes: ChangeEvent[];
}) {
  return (
    <div>
      <h4 style={{ margin: '0 0 0.75rem' }}>Anomalous Signals</h4>
      {signals.length === 0 ? (
        <p style={{ color: '#888', margin: 0 }}>No signals recorded.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Metric</th>
              <th style={{ ...th, textAlign: 'right' }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={td}>{s.metric}</td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: s.deltaPct > 0 ? '#f44336' : '#4caf50',
                    fontFamily: 'monospace',
                  }}
                >
                  {s.deltaPct > 0 ? '+' : ''}
                  {s.deltaPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4 style={{ margin: '1.5rem 0 0.75rem' }}>Recent Changes</h4>
      {changes.length === 0 ? (
        <p style={{ color: '#888', margin: 0 }}>No changes recorded.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {changes.map((c, i) => (
            <li
              key={i}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                gap: 16,
              }}
            >
              <span
                style={{
                  color: '#888',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  paddingTop: 2,
                }}
              >
                {new Date(c.at).toLocaleString()}
              </span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
