import type { Incident, ChangeEvent, Severity, TimelineEntry, Signal } from '@tracelens/shared';
import { confidenceFromScore } from '@tracelens/shared';
import type { AnomalyGroup } from './temporalCorrelation.js';

function deriveSeverity(maxDeltaPct: number): Severity {
  if (maxDeltaPct >= 200) return 'critical';
  if (maxDeltaPct >= 100) return 'high';
  if (maxDeltaPct >= 50)  return 'medium';
  return 'low';
}

export function buildIncident(
  group: AnomalyGroup,
  services: string[],
  changes: ChangeEvent[],
  incidentId?: string,
): Incident {
  const id = incidentId ?? `INC-${Date.parse(group.windowStart)}`;
  const windowMs = Date.parse(group.windowEnd) - Date.parse(group.windowStart);

  // Timeline: signal entries from anomalies + change entries
  const signalEntries: TimelineEntry[] = group.anomalies.map((a) => ({
    at: a.timestamp,
    kind: 'signal' as const,
    text: `${a.service} ${a.metric} deviated ${a.deltaPct > 0 ? '+' : ''}${Math.round(a.deltaPct)}% from baseline`,
  }));
  const changeEntries: TimelineEntry[] = changes.map((c) => ({
    at: c.at,
    kind: 'change' as const,
    text: c.text,
  }));
  const timeline = [...signalEntries, ...changeEntries].sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );

  // Signals
  const signals: Signal[] = group.anomalies.map((a) => ({
    metric: `${a.service}.${a.metric}`,
    deltaPct: a.deltaPct,
  }));

  // Severity — guard empty anomalies
  const maxDeltaPct = group.anomalies.length > 0
    ? Math.max(...group.anomalies.map((a) => Math.abs(a.deltaPct)))
    : 0;
  const severity = deriveSeverity(maxDeltaPct);

  // Candidates: only services that actually have anomalies, ranked by earliest onset
  const onsetByService = new Map<string, number>();
  for (const a of group.anomalies) {
    const t = Date.parse(a.timestamp);
    const existing = onsetByService.get(a.service);
    if (existing === undefined || t < existing) onsetByService.set(a.service, t);
  }

  const windowStart = Date.parse(group.windowStart);
  // Filter to services with observed anomalies, then sort by earliest onset
  const anomalousServices = services.filter((s) => onsetByService.has(s));
  const sortedServices = anomalousServices.sort(
    (a, b) => (onsetByService.get(a) ?? Infinity) - (onsetByService.get(b) ?? Infinity),
  );

  const candidates = sortedServices.map((svc, idx) => {
    const onset = onsetByService.get(svc) ?? windowStart;
    const onsetOffsetMs = onset - windowStart;
    // idx 0 = earliest-onset service after sort above
    const score = windowMs > 0 ? Math.max(0, 1 - onsetOffsetMs / windowMs) : 1;
    const confidence = confidenceFromScore(score);

    const serviceAnomalies = group.anomalies.filter((a) => a.service === svc);
    const why: string[] = [];
    if (idx === 0) why.push('First service to show anomaly in this window');
    for (const a of serviceAnomalies) {
      why.push(
        `${a.metric} spiked ${a.deltaPct > 0 ? '+' : ''}${Math.round(a.deltaPct)}% above rolling baseline`,
      );
      why.push(`Anomaly detected at ${a.timestamp}`);
    }

    return { component: svc, confidence, why, score };
  });

  return {
    id,
    startedAt: group.windowStart,
    severity,
    affectedServices: services,
    timeline,
    signals,
    changes,
    candidates,
  };
}
