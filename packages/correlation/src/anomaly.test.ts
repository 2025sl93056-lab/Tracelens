import { describe, it, expect } from 'vitest';
import { detectAnomalies } from './anomaly.js';
import type { TelemetryEvent } from '@tracelens/shared';

function metricEvent(
  service: string,
  name: string,
  value: number,
  timestamp: string,
): TelemetryEvent {
  return { type: 'metric', service, name, value, timestamp };
}

describe('detectAnomalies', () => {
  it('returns empty array for empty input', () => {
    expect(detectAnomalies([])).toEqual([]);
  });

  it('returns empty array when no anomalies exist', () => {
    const events: TelemetryEvent[] = [
      metricEvent('svc-a', 'latency', 100, '2026-10-27T10:00:00.000Z'),
      metricEvent('svc-a', 'latency', 102, '2026-10-27T10:00:01.000Z'),
      metricEvent('svc-a', 'latency', 98,  '2026-10-27T10:00:02.000Z'),
      metricEvent('svc-a', 'latency', 101, '2026-10-27T10:00:03.000Z'),
      metricEvent('svc-a', 'latency', 99,  '2026-10-27T10:00:04.000Z'),
      metricEvent('svc-a', 'latency', 103, '2026-10-27T10:00:05.000Z'),
    ];
    expect(detectAnomalies(events, 5)).toEqual([]);
  });

  it('detects a spike anomaly using the sliding window', () => {
    const baseline = [
      metricEvent('payment', 'latency', 300, '2026-10-27T10:00:00.000Z'),
      metricEvent('payment', 'latency', 310, '2026-10-27T10:00:01.000Z'),
      metricEvent('payment', 'latency', 290, '2026-10-27T10:00:02.000Z'),
      metricEvent('payment', 'latency', 305, '2026-10-27T10:00:03.000Z'),
    ];
    const spike = metricEvent('payment', 'latency', 1240, '2026-10-27T10:00:04.000Z');
    const results = detectAnomalies([...baseline, spike], 4);
    expect(results).toHaveLength(1);
    expect(results[0].service).toBe('payment');
    expect(results[0].metric).toBe('latency');
    expect(results[0].value).toBe(1240);
    expect(results[0].deltaPct).toBeGreaterThan(300);
    expect(results[0].baseline).toEqual([300, 310, 290, 305]);
  });

  it('ignores non-metric events', () => {
    const events: TelemetryEvent[] = [
      { type: 'deploy', service: 'payment', name: 'deployment', timestamp: '2026-10-27T10:00:00.000Z' },
      { type: 'log',    service: 'payment', name: 'error',      timestamp: '2026-10-27T10:00:01.000Z' },
    ];
    expect(detectAnomalies(events)).toEqual([]);
  });

  it('tracks separate series per (service, metric) pair', () => {
    const baselineA = [
      metricEvent('svc-a', 'latency', 100, '2026-10-27T10:00:00.000Z'),
      metricEvent('svc-a', 'latency', 100, '2026-10-27T10:00:01.000Z'),
      metricEvent('svc-a', 'latency', 100, '2026-10-27T10:00:02.000Z'),
    ];
    const baselineB = [
      metricEvent('svc-b', 'latency', 200, '2026-10-27T10:00:00.000Z'),
      metricEvent('svc-b', 'latency', 200, '2026-10-27T10:00:01.000Z'),
      metricEvent('svc-b', 'latency', 200, '2026-10-27T10:00:02.000Z'),
    ];
    const spikeA = metricEvent('svc-a', 'latency', 999, '2026-10-27T10:00:03.000Z');
    const normalB = metricEvent('svc-b', 'latency', 210, '2026-10-27T10:00:03.000Z');
    const results = detectAnomalies([...baselineA, ...baselineB, spikeA, normalB], 3);
    expect(results).toHaveLength(1);
    expect(results[0].service).toBe('svc-a');
  });

  it('does not flag a point before the window is full', () => {
    const events: TelemetryEvent[] = [
      metricEvent('svc', 'cpu', 10, '2026-10-27T10:00:00.000Z'),
      metricEvent('svc', 'cpu', 10, '2026-10-27T10:00:01.000Z'),
      metricEvent('svc', 'cpu', 999, '2026-10-27T10:00:02.000Z'),
    ];
    expect(detectAnomalies(events, 4)).toEqual([]);
  });
});
