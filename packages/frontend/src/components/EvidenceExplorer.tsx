import type { Signal, ChangeEvent } from '@tracelens/shared';

export function EvidenceExplorer({
  signals,
  changes,
}: {
  signals: Signal[];
  changes: ChangeEvent[];
}) {
  return (
    <div>
      <div className="section-header" style={{ marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Anomalous Signals
        </span>
      </div>

      {signals.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', margin: '0 0 var(--space-6)' }}>No signals recorded.</p>
      ) : (
        <table className="evidence-table" style={{ marginBottom: 'var(--space-6)' }}>
          <thead>
            <tr>
              <th>Metric</th>
              <th style={{ textAlign: 'right' }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => (
              <tr key={i}>
                <td>
                  <span className="metric-name">{s.metric}</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className={`delta ${s.deltaPct > 0 ? 'delta-up' : 'delta-down'}`}>
                    {s.deltaPct > 0 ? '↑' : '↓'} {Math.abs(s.deltaPct)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="section-header" style={{ marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recent Changes
        </span>
      </div>

      {changes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>No changes recorded.</p>
      ) : (
        <div>
          {changes.map((c, i) => (
            <div key={i} className="change-item">
              <span className="change-time">{new Date(c.at).toLocaleString()}</span>
              <span className="change-text">{c.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
