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
      {/* Signals */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 'var(--sp-3)',
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Anomalous Signals
          </span>
          {signals.length > 0 && (
            <span className="count-pill">{signals.length}</span>
          )}
        </div>

        {signals.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No signals recorded.
          </p>
        ) : (
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th style={{ textAlign: 'right' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr
                  key={i}
                  style={{
                    animation: 'fadeIn 0.2s ease both',
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: s.deltaPct > 50 ? 'var(--critical)' : s.deltaPct > 20 ? 'var(--high)' : 'var(--medium)',
                          flexShrink: 0,
                          boxShadow: s.deltaPct > 50 ? '0 0 6px var(--critical)' : 'none',
                        }}
                      />
                      <span className="metric-name">{s.metric}</span>
                    </div>
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
      </div>

      {/* Changes */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 'var(--sp-3)',
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Recent Changes
          </span>
          {changes.length > 0 && (
            <span className="count-pill">{changes.length}</span>
          )}
        </div>

        {changes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No changes recorded.
          </p>
        ) : (
          <div>
            {changes.map((c, i) => (
              <div
                key={i}
                className="change-item"
                style={{
                  animation: 'fadeIn 0.2s ease both',
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <span className="change-time">
                  {new Date(c.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="change-text">{c.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
