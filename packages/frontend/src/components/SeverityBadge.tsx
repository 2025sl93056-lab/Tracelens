import type { Severity } from '@tracelens/shared';
import { severityLabel } from '../format.js';

const SEVERITY_CONFIG: Record<Severity, { dot: string; pulse?: boolean }> = {
  critical: { dot: '●', pulse: true },
  high:     { dot: '●' },
  medium:   { dot: '●' },
  low:      { dot: '●' },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`badge badge-${severity}`}>
      <span
        style={{
          fontSize: 7,
          animation: cfg.pulse ? 'dotBlink 1.5s ease-in-out infinite' : undefined,
        }}
      >
        {cfg.dot}
      </span>
      {severityLabel(severity)}
    </span>
  );
}
