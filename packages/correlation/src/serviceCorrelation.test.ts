import { describe, it, expect } from 'vitest';
import { findCoAnomalousServices } from './serviceCorrelation.js';
import type { AnomalyGroup } from './temporalCorrelation.js';
import type { AnomalyResult } from './anomaly.js';

function anomaly(service: string): AnomalyResult {
  return {
    service,
    metric: 'latency',
    timestamp: '2026-10-27T10:00:00.000Z',
    deltaPct: 200,
    value: 1000,
    baseline: [100],
  };
}

function group(anomalies: AnomalyResult[]): AnomalyGroup {
  return {
    windowStart: '2026-10-27T10:00:00.000Z',
    windowEnd: '2026-10-27T10:00:30.000Z',
    anomalies,
  };
}

describe('findCoAnomalousServices', () => {
  it('returns empty array for a group with no anomalies', () => {
    expect(findCoAnomalousServices(group([]))).toEqual([]);
  });

  it('returns the single service for a single-anomaly group', () => {
    expect(findCoAnomalousServices(group([anomaly('payment')]))).toEqual(['payment']);
  });

  it('returns all services in a multi-service group', () => {
    const services = findCoAnomalousServices(
      group([anomaly('payment'), anomaly('auth'), anomaly('cart')]),
    );
    expect(services.sort()).toEqual(['auth', 'cart', 'payment']);
  });

  it('deduplicates services with multiple anomalies', () => {
    const services = findCoAnomalousServices(
      group([anomaly('payment'), anomaly('payment'), anomaly('auth')]),
    );
    expect(services.sort()).toEqual(['auth', 'payment']);
  });
});
