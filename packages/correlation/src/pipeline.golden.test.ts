import { describe, it, expect } from 'vitest';
import type { TelemetryEvent } from '@tracelens/shared';
import { runCorrelation } from './pipeline.js';

/**
 * Golden / reproducibility test.
 *
 * A fixed, hand-authored telemetry stream models a real cascade: a bad deploy
 * to `payment` is followed by `payment` latency spiking first, then `order` and
 * `gateway` degrading as the failure propagates upstream. Running the full
 * pipeline over this fixture must *always* yield the same incident with
 * `payment` as the top candidate. This guards the end-to-end behaviour
 * (detect → group → correlate → what-changed → assemble), not just one stage.
 */

const T0 = Date.parse('2026-11-01T12:00:00.000Z');
const iso = (offsetMs: number): string => new Date(T0 + offsetMs).toISOString();

function metric(service: string, value: number, offsetMs: number): TelemetryEvent {
  return { type: 'metric', service, name: 'latency', value, timestamp: iso(offsetMs) };
}

/** Flat 100ms baseline, one point/sec, long enough to fill the rolling window. */
function flatBaseline(service: string, count: number): TelemetryEvent[] {
  return Array.from({ length: count }, (_, i) => metric(service, 100, i * 1000));
}

const GOLDEN_STREAM: TelemetryEvent[] = [
  // Bad deploy to payment, 10s before onset.
  { type: 'deploy', service: 'payment', name: 'v4.3.1', timestamp: iso(-10_000) },

  // Baselines so each series' rolling window is primed (6 points, windowSize 5).
  ...flatBaseline('payment', 6),
  ...flatBaseline('order', 6),
  ...flatBaseline('gateway', 6),

  // Cascade: payment spikes first (+700%), then order (+400%), then gateway (+150%).
  metric('payment', 800, 6_000),
  metric('order', 500, 21_000),
  metric('gateway', 250, 36_000),
];

describe('runCorrelation — golden incident', () => {
  const incidents = runCorrelation(GOLDEN_STREAM, { windowSize: 5, changeLookbackMs: 60_000 });

  it('produces exactly one incident for the cascade', () => {
    expect(incidents).toHaveLength(1);
  });

  it('ranks payment as the top candidate (earliest onset)', () => {
    expect(incidents[0].candidates[0].component).toBe('payment');
  });

  it('gives the top candidate high confidence', () => {
    expect(incidents[0].candidates[0].confidence).toBe('high');
  });

  it('includes all three cascading services as affected', () => {
    expect([...incidents[0].affectedServices].sort()).toEqual(['gateway', 'order', 'payment']);
  });

  it('attaches the preceding payment deploy as a change', () => {
    expect(incidents[0].changes.map((c) => c.text)).toContain('deploy: v4.3.1 on payment');
  });

  it('derives critical severity from the largest spike', () => {
    expect(incidents[0].severity).toBe('critical');
  });

  it('is deterministic — a second run yields an identical incident', () => {
    const again = runCorrelation(GOLDEN_STREAM, { windowSize: 5, changeLookbackMs: 60_000 });
    expect(again).toEqual(incidents);
  });
});
