import type { Severity } from '@tracelens/shared';
import { severityLabel } from '../format.js';

const SEVERITY_DOT: Record<Severity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge badge-${severity}`}>
      {SEVERITY_DOT[severity]}&nbsp;{severityLabel(severity)}
    </span>
  );
}
