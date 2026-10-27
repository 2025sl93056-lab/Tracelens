import type { Severity } from '@tracelens/shared';
import { severityLabel } from '../format.js';

const COLORS: Record<Severity, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      style={{
        background: COLORS[severity],
        color: '#fff',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {severityLabel(severity)}
    </span>
  );
}
