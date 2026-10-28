import type { RootCauseCandidate } from '@tracelens/shared';
import { ConfidenceBadge } from './ConfidenceBadge.js';

export function WhatChanged({ candidates }: { candidates: RootCauseCandidate[] }) {
  if (candidates.length === 0) {
    return <p style={{ color: '#888' }}>No correlation candidates found.</p>;
  }
  return (
    <div>
      <p
        style={{
          color: '#888',
          fontStyle: 'italic',
          margin: '0 0 1rem',
          fontSize: '0.9rem',
        }}
      >
        These are correlation candidates based on temporal and service proximity — not confirmed causes.
      </p>
      {candidates.map((c, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            padding: '1rem',
            marginBottom: '0.75rem',
            background: '#fafafa',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            <strong style={{ fontFamily: 'monospace' }}>{c.component}</strong>
            <ConfidenceBadge level={c.confidence} />
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {c.why.map((w, j) => (
              <li key={j} style={{ color: '#444', marginBottom: 4 }}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
