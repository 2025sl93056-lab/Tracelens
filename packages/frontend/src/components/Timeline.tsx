import type { TimelineEntry } from '@tracelens/shared';
import { shortTime } from '../format.js';

const KIND_META: Record<TimelineEntry['kind'], { icon: string; label: string }> = {
  deploy: { icon: '🚀', label: 'Deploy' },
  signal: { icon: '⚡', label: 'Signal' },
  change: { icon: '🔧', label: 'Change' },
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
        <span className="empty-state-icon">⏱</span>
        <div className="empty-state-title">No timeline entries</div>
      </div>
    );
  }

  return (
    <ol className="timeline">
      {entries.map((e, i) => {
        const meta = KIND_META[e.kind];
        return (
          <li
            key={i}
            className="timeline-entry"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className={`timeline-dot timeline-dot-${e.kind}`}>
              <span style={{ fontSize: 8 }}>{meta.icon}</span>
            </div>
            <div className="timeline-meta">
              <span className="timeline-time">{shortTime(e.at)}</span>
              <span className={`timeline-kind timeline-kind-${e.kind}`}>{meta.label}</span>
            </div>
            <div className="timeline-text">{e.text}</div>
          </li>
        );
      })}
    </ol>
  );
}
