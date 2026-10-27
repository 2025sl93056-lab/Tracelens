import type { AnomalyGroup } from './temporalCorrelation.js';

export function findCoAnomalousServices(group: AnomalyGroup): string[] {
  return [...new Set(group.anomalies.map((a) => a.service))];
}
