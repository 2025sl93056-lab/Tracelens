import { describe, it, expect } from 'vitest';
import { collectChanges } from './whatChanged.js';
import type { TelemetryEvent } from '@tracelens/shared';

function event(type: TelemetryEvent['type'], timestamp: string, name = 'deploy-v4'): TelemetryEvent {
  return { type, service: 'payment', name, timestamp };
}

describe('collectChanges', () => {
  const windowStart = '2026-10-27T10:00:00.000Z';
  const windowEnd   = '2026-10-27T10:01:00.000Z';

  it('returns empty array when no events provided', () => {
    expect(collectChanges([], windowStart, windowEnd)).toEqual([]);
  });

  it('collects deploy events within the window', () => {
    const changes = collectChanges(
      [event('deploy', '2026-10-27T10:00:30.000Z')],
      windowStart,
      windowEnd,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].at).toBe('2026-10-27T10:00:30.000Z');
    expect(changes[0].text).toContain('deploy-v4');
  });

  it('collects config_change events within the window', () => {
    const changes = collectChanges(
      [event('config_change', '2026-10-27T10:00:45.000Z', 'feature-flag-update')],
      windowStart,
      windowEnd,
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].text).toContain('feature-flag-update');
  });

  it('excludes metric, log, and trace events', () => {
    const changes = collectChanges(
      [
        event('metric', '2026-10-27T10:00:30.000Z'),
        event('log',    '2026-10-27T10:00:31.000Z'),
        event('trace',  '2026-10-27T10:00:32.000Z'),
      ],
      windowStart,
      windowEnd,
    );
    expect(changes).toEqual([]);
  });

  it('excludes events outside the window', () => {
    const changes = collectChanges(
      [
        event('deploy', '2026-10-27T09:59:59.000Z'), // before
        event('deploy', '2026-10-27T10:01:01.000Z'), // after
      ],
      windowStart,
      windowEnd,
    );
    expect(changes).toEqual([]);
  });

  it('includes events exactly on the window boundaries', () => {
    const changes = collectChanges(
      [
        event('deploy', windowStart),
        event('deploy', windowEnd),
      ],
      windowStart,
      windowEnd,
    );
    expect(changes).toHaveLength(2);
  });

  it('throws RangeError for invalid windowStart', () => {
    expect(() => collectChanges([], 'not-a-date', '2026-10-27T10:01:00.000Z')).toThrow(RangeError);
  });

  it('throws RangeError for invalid windowEnd', () => {
    expect(() => collectChanges([], '2026-10-27T10:00:00.000Z', '')).toThrow(RangeError);
  });

  it('throws RangeError when windowStart is after windowEnd', () => {
    expect(() =>
      collectChanges([], '2026-10-27T10:01:00.000Z', '2026-10-27T10:00:00.000Z'),
    ).toThrow(RangeError);
  });

  it('returns both deploy and config_change events when both are present', () => {
    const changes = collectChanges(
      [
        event('deploy',        '2026-10-27T10:00:20.000Z', 'deploy-v4'),
        event('config_change', '2026-10-27T10:00:40.000Z', 'flag-update'),
      ],
      windowStart,
      windowEnd,
    );
    expect(changes).toHaveLength(2);
    expect(changes[0].at).toBe('2026-10-27T10:00:20.000Z');
    expect(changes[1].at).toBe('2026-10-27T10:00:40.000Z');
  });
});
