import type { ConfidenceLevel } from '@tracelens/shared';

const CONF_CONFIG: Record<ConfidenceLevel, { icon: string; label: string }> = {
  high:   { icon: '▲', label: 'High Confidence' },
  medium: { icon: '◆', label: 'Medium Confidence' },
  low:    { icon: '▽', label: 'Low Confidence' },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONF_CONFIG[level];
  return (
    <span className={`badge badge-conf-${level}`} style={{ fontSize: '0.68rem' }}>
      <span style={{ fontSize: 8 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
