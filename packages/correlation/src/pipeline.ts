import type { Incident, TelemetryEvent } from '@tracelens/shared';
import { detectAnomalies } from './anomaly.js';
import { groupByTimeWindow } from './temporalCorrelation.js';
import { findCoAnomalousServices } from './serviceCorrelation.js';
import { collectChanges } from './whatChanged.js';
import { buildIncident } from './incidentFactory.js';

/** Tuning knobs for the end-to-end correlation pipeline. */
export interface CorrelationOptions {
  /** Rolling-baseline size per (service, metric). Forwarded to `detectAnomalies`. */
  windowSize?: number;
  /** Minimum % deviation to flag an anomaly. Forwarded to `detectAnomalies`. */
  thresholdPct?: number;
  /** Max gap (ms) between anomalies before a new group starts. Forwarded to `groupByTimeWindow`. */
  maxGapMs?: number;
  /**
   * How far before an incident window to look for deploy/config changes.
   * A bad deploy usually lands *just before* onset, so the raw anomaly window
   * would miss it. Defaults to 5 minutes.
   */
  changeLookbackMs?: number;
}

const DEFAULT_CHANGE_LOOKBACK_MS = 5 * 60_000;

/**
 * Run the full correlation pipeline over a telemetry stream, producing one
 * `Incident` per temporally-grouped burst of anomalies.
 *
 * Stages: detect anomalies → group in time → find co-anomalous services →
 * collect nearby changes → assemble incident.
 */
export function runCorrelation(
  events: TelemetryEvent[],
  options: CorrelationOptions = {},
): Incident[] {
  const { windowSize, thresholdPct, maxGapMs, changeLookbackMs = DEFAULT_CHANGE_LOOKBACK_MS } =
    options;

  const anomalies = detectAnomalies(events, windowSize, thresholdPct);
  const groups = groupByTimeWindow(anomalies, maxGapMs);

  return groups.map((group) => {
    const services = findCoAnomalousServices(group);
    // Widen the change search backwards so a deploy just before onset is caught.
    const changeWindowStart = new Date(
      Date.parse(group.windowStart) - changeLookbackMs,
    ).toISOString();
    const changes = collectChanges(events, changeWindowStart, group.windowEnd);
    return buildIncident(group, services, changes);
  });
}
