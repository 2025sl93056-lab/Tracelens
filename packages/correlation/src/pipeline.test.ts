import { describe, it, expect } from 'vitest';
import type { TelemetryEvent } from '@tracelens/shared';
import { runCorrelation } from './pipeline.js';

/** Build a metric event. */
function metric(service: string, name: string, value: number, timestamp: string): TelemetryEvent {
  return { type: 'metric', service, name, value, timestamp };
}

/** Build a deploy event. */
function deploy(service: string, name: string, timestamp: string): TelemetryEvent {
  return { type: 'deploy', service, name, timestamp };
}

/**
 * Emit `count` flat baseline metric points for a service, one per second from
 * `startMs`, so the rolling window fills before the anomaly under test.
 */
function baseline(
  service: string,
  name: string,
  value: number,
  startMs: number,
  count: number,
): TelemetryEvent[] {
  return Array.from({ length: count }, (_, i) =>
    metric(service, name, value, new Date(startMs + i * 1000).toISOString()),
  );
}

describe('runCorrelation', () => {
  it('returns no incidents for an empty event stream', () => {
    expect(runCorrelation([])).toEqual([]);
  });

  it('returns no incidents when nothing is anomalous', () => {
    const events = baseline('payment', 'latency', 100, Date.parse('2026-11-01T00:00:00.000Z'), 20);
    expect(runCorrelation(events, { windowSize: 5 })).toEqual([]);
  });

  it('produces one incident for a single burst of co-occurring anomalies', () => {
    const t0 = Date.parse('2026-11-01T00:00:00.000Z');
    const events: TelemetryEvent[] = [
      ...baseline('payment', 'latency', 100, t0, 6),
      // spike well above the 50% threshold, right after the window fills
      metric('payment', 'latency', 900, new Date(t0 + 6000).toISOString()),
    ];

    const incidents = runCorrelation(events, { windowSize: 5 });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].candidates[0].component).toBe('payment');
    expect(incidents[0].affectedServices).toContain('payment');
  });

  it('splits anomalies into separate incidents when they are far apart in time', () => {
    const t0 = Date.parse('2026-11-01T00:00:00.000Z');
    // Second burst starts 10 minutes later — well beyond the default 60s gap.
    const t1 = t0 + 10 * 60_000;
    const events: TelemetryEvent[] = [
      ...baseline('payment', 'latency', 100, t0, 6),
      metric('payment', 'latency', 900, new Date(t0 + 6000).toISOString()),
      ...baseline('order', 'latency', 100, t1, 6),
      metric('order', 'latency', 900, new Date(t1 + 6000).toISOString()),
    ];

    const incidents = runCorrelation(events, { windowSize: 5 });
    expect(incidents).toHaveLength(2);
  });

  it('attaches a deploy that precedes onset via the change look-back window', () => {
    const t0 = Date.parse('2026-11-01T00:00:00.000Z');
    const events: TelemetryEvent[] = [
      // deploy 30s before the first anomaly — outside the anomaly window itself
      deploy('payment', 'v4.3.1', new Date(t0 + 5000).toISOString()),
      ...baseline('payment', 'latency', 100, t0, 6),
      metric('payment', 'latency', 900, new Date(t0 + 6000).toISOString()),
    ];

    const incidents = runCorrelation(events, { windowSize: 5, changeLookbackMs: 60_000 });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].changes.map((c) => c.text)).toContain('deploy: v4.3.1 on payment');
  });
});
