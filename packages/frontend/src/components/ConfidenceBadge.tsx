import type { ConfidenceLevel } from '@tracelens/shared';

const COLORS: Record<ConfidenceLevel, string> = {
  low: '#9e9e9e',
  medium: '#ff9800',
  high: '#f44336',
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span
      style={{
        background: COLORS[level],
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {level} confidence
    </span>
  );
}
