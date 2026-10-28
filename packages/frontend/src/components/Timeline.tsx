import type { TimelineEntry } from '@tracelens/shared';
import { shortTime } from '../format.js';

const KIND_ICON: Record<TimelineEntry['kind'], string> = {
  deploy: '[deploy]',
  signal: '[signal]',
  change: '[change]',
};

const KIND_COLOR: Record<TimelineEntry['kind'], string> = {
  deploy: '#4a90e2',
  signal: '#f44336',
  change: '#ff9800',
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p style={{ color: '#888' }}>No timeline entries.</p>;
  }
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {entries.map((e, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid #f0f0f0',
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              minWidth: 64,
              color: '#888',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              paddingTop: 2,
            }}
          >
            {shortTime(e.at)}
          </span>
          <span
            style={{
              minWidth: 64,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: KIND_COLOR[e.kind],
              paddingTop: 2,
            }}
          >
            {KIND_ICON[e.kind]}
          </span>
          <span>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}
