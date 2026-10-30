import type { ConfidenceLevel } from '@tracelens/shared';

const CONF_ICON: Record<ConfidenceLevel, string> = {
  high: '🔴',
  medium: '🟠',
  low: '⚪',
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  return (
    <span className={`badge badge-conf-${level}`}>
      {CONF_ICON[level]}&nbsp;{level} confidence
    </span>
  );
}
