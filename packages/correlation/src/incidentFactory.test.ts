import { describe, it, expect } from 'vitest';
import { buildIncident } from './incidentFactory.js';
import type { AnomalyGroup } from './temporalCorrelation.js';
import type { AnomalyResult } from './anomaly.js';
import type { ChangeEvent } from '@tracelens/shared';

function anomaly(
  service: string,
  timestamp: string,
  deltaPct: number,
  metric = 'latency',
): AnomalyResult {
  return { service, metric, timestamp, deltaPct, value: 1000, baseline: [100] };
}

function group(anomalies: AnomalyResult[]): AnomalyGroup {
  const sorted = [...anomalies].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  return {
    windowStart: sorted[0].timestamp,
    windowEnd: sorted[sorted.length - 1].timestamp,
    anomalies: sorted,
  };
}

describe('buildIncident', () => {
  it('assembles an incident with the correct shape', () => {
    const g = group([anomaly('payment', '2026-10-27T10:00:00.000Z', 200)]);
    const inc = buildIncident(g, ['payment'], [], 'INC-001');
    expect(inc.id).toBe('INC-001');
    expect(inc.affectedServices).toEqual(['payment']);
    expect(inc.candidates).toHaveLength(1);
    expect(inc.signals).toHaveLength(1);
  });

  it('derives severity from the highest deltaPct', () => {
    expect(
      buildIncident(group([anomaly('s', '2026-10-27T10:00:00.000Z', 250)]), ['s'], []).severity,
    ).toBe('critical');
    expect(
      buildIncident(group([anomaly('s', '2026-10-27T10:00:00.000Z', 150)]), ['s'], []).severity,
    ).toBe('high');
    expect(
      buildIncident(group([anomaly('s', '2026-10-27T10:00:00.000Z', 75)]), ['s'], []).severity,
    ).toBe('medium');
    expect(
      buildIncident(group([anomaly('s', '2026-10-27T10:00:00.000Z', 30)]), ['s'], []).severity,
    ).toBe('low');
  });

  it('orders timeline entries by timestamp ascending', () => {
    const changes: ChangeEvent[] = [
      { at: '2026-10-27T10:00:05.000Z', text: 'deploy v2' },
    ];
    const g = group([
      anomaly('payment', '2026-10-27T10:00:10.000Z', 200),
      anomaly('auth',    '2026-10-27T10:00:00.000Z', 200),
    ]);
    const inc = buildIncident(g, ['payment', 'auth'], changes);
    const times = inc.timeline.map((e) => e.at);
    expect(times).toEqual([...times].sort());
  });

  it('ranks candidates by earliest onset', () => {
    const g = group([
      anomaly('cart',    '2026-10-27T10:00:30.000Z', 200),
      anomaly('payment', '2026-10-27T10:00:00.000Z', 200),
      anomaly('auth',    '2026-10-27T10:00:15.000Z', 200),
    ]);
    const inc = buildIncident(g, ['cart', 'payment', 'auth'], []);
    expect(inc.candidates[0].component).toBe('payment');
    expect(inc.candidates[1].component).toBe('auth');
    expect(inc.candidates[2].component).toBe('cart');
  });

  it('gives top candidate confidence=high and "First service" in why', () => {
    const g = group([
      anomaly('payment', '2026-10-27T10:00:00.000Z', 312),
      anomaly('auth',    '2026-10-27T10:00:30.000Z', 200),
    ]);
    const inc = buildIncident(g, ['payment', 'auth'], []);
    expect(inc.candidates[0].confidence).toBe('high');
    expect(inc.candidates[0].why.some((w) => w.includes('First service'))).toBe(true);
  });

  it('handles a single-anomaly group (windowMs = 0) without crashing', () => {
    const g = group([anomaly('payment', '2026-10-27T10:00:00.000Z', 200)]);
    // windowStart === windowEnd → windowMs = 0, score falls back to 1
    const inc = buildIncident(g, ['payment'], []);
    expect(inc.candidates).toHaveLength(1);
    expect(inc.candidates[0].component).toBe('payment');
    expect(inc.candidates[0].score).toBe(1);
    expect(inc.candidates[0].confidence).toBe('high');
  });

  it('excludes services from candidates that have no anomaly in the group', () => {
    const g = group([anomaly('payment', '2026-10-27T10:00:00.000Z', 200)]);
    // 'ghost-svc' is in services but has no anomaly
    const inc = buildIncident(g, ['payment', 'ghost-svc'], []);
    expect(inc.candidates.map((c) => c.component)).not.toContain('ghost-svc');
    expect(inc.candidates).toHaveLength(1);
  });

  it('returns empty candidates for empty services array', () => {
    const g = group([anomaly('payment', '2026-10-27T10:00:00.000Z', 200)]);
    const inc = buildIncident(g, [], []);
    expect(inc.candidates).toEqual([]);
    expect(inc.affectedServices).toEqual([]);
  });

  // ── Injected-incident integration test ──────────────────────────────────
  it('known injected incident: payment-service is top candidate', () => {
    const T0  = '2026-10-27T14:00:00.000Z'; // payment — T+0
    const T15 = '2026-10-27T14:00:15.000Z'; // auth     — T+15s
    const T30 = '2026-10-27T14:00:30.000Z'; // cart     — T+30s

    const g = group([
      anomaly('cart',    T30, 150, 'http.latency'),
      anomaly('payment', T0,  312, 'http.latency'),
      anomaly('auth',    T15, 200, 'http.latency'),
    ]);

    const inc = buildIncident(
      g,
      ['cart', 'payment', 'auth'],
      [],
      'INC-INJECTED',
    );

    // Top candidate is payment-service (earliest onset)
    expect(inc.candidates[0].component).toBe('payment');
    // Confidence should be high (score ≈ 1.0 for earliest)
    expect(inc.candidates[0].confidence).toBe('high');
    // why[] contains the spike description and "First service" marker
    expect(inc.candidates[0].why.some((w) => w.includes('First service'))).toBe(true);
    expect(inc.candidates[0].why.some((w) => w.includes('http.latency'))).toBe(true);
    // All three services affected
    expect(inc.affectedServices.sort()).toEqual(['auth', 'cart', 'payment']);
    // Timeline has 3 entries ordered by time
    expect(inc.timeline).toHaveLength(3);
    expect(inc.timeline[0].at).toBe(T0);
    expect(inc.timeline[1].at).toBe(T15);
    expect(inc.timeline[2].at).toBe(T30);
  });
});
