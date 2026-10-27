import type { TelemetryEvent } from '@tracelens/shared';
import { isAnomalous } from './index.js';

export interface AnomalyResult {
  service: string;
  metric: string;
  timestamp: string;
  deltaPct: number;
  value: number;
  baseline: number[];
}

export function detectAnomalies(
  events: TelemetryEvent[],
  windowSize = 10,
  thresholdPct = 50,
): AnomalyResult[] {
  const series = new Map<string, number[]>();
  const results: AnomalyResult[] = [];

  for (const event of events) {
    if (event.type !== 'metric' || event.value === undefined) continue;

    const key = `${event.service}::${event.name}`;
    const window = series.get(key) ?? [];

    if (window.length >= windowSize) {
      const { anomalous, deltaPct } = isAnomalous(event.value, window, thresholdPct);
      if (anomalous) {
        results.push({
          service: event.service,
          metric: event.name,
          timestamp: event.timestamp,
          deltaPct,
          value: event.value,
          baseline: [...window],
        });
      }
    }

    const next = [...window, event.value];
    if (next.length > windowSize) next.shift();
    series.set(key, next);
  }

  return results;
}
