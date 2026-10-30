import type { RootCauseCandidate } from '@tracelens/shared';
import { ConfidenceBadge } from './ConfidenceBadge.js';

export function WhatChanged({ candidates }: { candidates: RootCauseCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
        <span className="empty-state-icon">🔍</span>
        <div className="empty-state-title">No correlation candidates found</div>
        <div className="empty-state-desc">No changes were correlated with this incident.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: 'var(--sp-5)' }}>
        <span>ℹ</span>
        <span>
          Correlation candidates ranked by temporal and service proximity —{' '}
          <strong>not confirmed causes</strong>. Engineers make the final determination.
        </span>
      </div>

      {candidates.map((c, i) => (
        <div
          key={i}
          className="candidate-card"
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <div className="candidate-header">
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginRight: 4,
              }}
            >
              #{i + 1}
            </span>
            <span className="candidate-component">{c.component}</span>
            <ConfidenceBadge level={c.confidence} />
          </div>
          <ul className="candidate-reasons">
            {c.why.map((w, j) => (
              <li key={j} className="candidate-reason">{w}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
