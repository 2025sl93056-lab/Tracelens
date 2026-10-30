import type { RootCauseCandidate } from '@tracelens/shared';
import { ConfidenceBadge } from './ConfidenceBadge.js';

export function WhatChanged({ candidates }: { candidates: RootCauseCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">No correlation candidates found</div>
        <div className="empty-state-desc">No changes were correlated with this incident.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
        <span>ℹ</span>
        <span>
          Correlation candidates based on temporal and service proximity —
          not confirmed causes. Engineers make the final determination.
        </span>
      </div>
      {candidates.map((c, i) => (
        <div key={i} className="candidate-card" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="candidate-header">
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
