/**
 * correlation — the analytical core of TraceLens.
 *
 * OWNER: Member 2 (Correlation & Incident Intelligence)
 *
 * GOAL: turn a stream of TelemetryEvents into Incidents with a timeline, ranked
 * root-cause candidates, and a confidence level — presenting evidence, never
 * certainty.
 *
 * TODO (issue + PR per item):
 *  - [ ] Anomaly detection (threshold + rolling baseline).
 *  - [ ] Temporal correlation (group signals within a time window).
 *  - [ ] Service correlation (co-anomalous services).
 *  - [ ] "What changed?" correlation (deploy/config events just before onset).
 *  - [ ] Incident creation + timeline generation.
 *  - [ ] Root-cause candidate ranking -> confidenceFromScore(score).
 *  - [ ] (Stretch) Incident Copilot: retrieve evidence first, explain second.
 *
 * The helpers below are tested starting points for anomaly detection.
 */

/** Percent change of `current` vs `baseline` (e.g. 1240 vs 300 => +313%). */
export function percentDelta(current: number, baseline: number): number {
  if (baseline === 0) return current === 0 ? 0 : Infinity;
  return ((current - baseline) / baseline) * 100;
}

/** Mean of a numeric series (0 for an empty series). */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Flag a value as anomalous if it deviates from the rolling baseline mean by
 * more than `thresholdPct` percent. Returns the delta so callers can rank.
 */
export function isAnomalous(
  current: number,
  baseline: number[],
  thresholdPct = 50,
): { anomalous: boolean; deltaPct: number } {
  const deltaPct = percentDelta(current, mean(baseline));
  return { anomalous: Math.abs(deltaPct) >= thresholdPct, deltaPct };
}

export { detectAnomalies } from './anomaly.js';
export type { AnomalyResult } from './anomaly.js';

export { groupByTimeWindow } from './temporalCorrelation.js';
export type { AnomalyGroup } from './temporalCorrelation.js';

export { findCoAnomalousServices } from './serviceCorrelation.js';

export { collectChanges } from './whatChanged.js';

export { buildIncident } from './incidentFactory.js';
