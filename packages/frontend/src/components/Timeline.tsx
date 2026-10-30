import type { TimelineEntry } from '@tracelens/shared';
import { shortTime } from '../format.js';

const KIND_ICON: Record<TimelineEntry['kind'], string> = {
  deploy: '🚀',
  signal: '⚡',
  change: '🔧',
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
        <div className="empty-state-icon">⏱</div>
        <div className="empty-state-title">No timeline entries</div>
      </div>
    );
  }

  return (
    <ol className="timeline">
      {entries.map((e, i) => (
        <li
          key={i}
          className="timeline-entry"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className={`timeline-dot timeline-dot-${e.kind}`}>
            <span style={{ fontSize: 9 }}>{KIND_ICON[e.kind]}</span>
          </div>
          <div className="timeline-meta">
            <span className="timeline-time">{shortTime(e.at)}</span>
            <span className={`timeline-kind timeline-kind-${e.kind}`}>{e.kind}</span>
          </div>
          <div className="timeline-text">{e.text}</div>
        </li>
      ))}
    </ol>
  );
}
