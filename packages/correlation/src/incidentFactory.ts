import type {
  Incident,
  ChangeEvent,
  Severity,
  TimelineEntry,
  Signal,
  DependencyGraph,
} from '@tracelens/shared';
import { confidenceFromScore } from '@tracelens/shared';
import { upstreamImpact } from '@tracelens/graph';
import type { AnomalyGroup } from './temporalCorrelation.js';

function deriveSeverity(maxDeltaPct: number): Severity {
  if (maxDeltaPct >= 200) return 'critical';
  if (maxDeltaPct >= 100) return 'high';
  if (maxDeltaPct >= 50)  return 'medium';
  return 'low';
}

/** Weight split for the blended candidate score when a graph is available. */
const ONSET_WEIGHT = 0.7;
const BLAST_WEIGHT = 0.3;

export function buildIncident(
  group: AnomalyGroup,
  services: string[],
  changes: ChangeEvent[],
  incidentId?: string,
  graph?: DependencyGraph,
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
  // Services with an observed anomaly, in earliest-onset order. `.filter()`
  // yields a fresh array, so sorting it never mutates the caller's input.
  const candidateServices = services
    .filter((s) => onsetByService.has(s))
    .sort((a, b) => (onsetByService.get(a) ?? Infinity) - (onsetByService.get(b) ?? Infinity));

  // The earliest-onset service keeps the "first service" marker regardless of
  // how blast-radius weighting later reorders the ranking.
  const firstMover = candidateServices[0];

  // Blast radius = number of upstream dependents (who is affected if this
  // service degrades). Only meaningful when a dependency graph is supplied.
  const blastByService = new Map<string, number>();
  if (graph) {
    for (const svc of candidateServices) {
      blastByService.set(svc, upstreamImpact(graph, svc).affected.length);
    }
  }
  const maxBlast = Math.max(0, ...blastByService.values());
  // Only blend when at least one candidate has a non-zero blast radius; an empty
  // or irrelevant graph leaves onset-only ranking untouched.
  const useBlast = maxBlast > 0;

  const scored = candidateServices.map((svc) => {
    const onset = onsetByService.get(svc) ?? windowStart;
    const onsetOffsetMs = onset - windowStart;
    const onsetScore = windowMs > 0 ? Math.max(0, 1 - onsetOffsetMs / windowMs) : 1;

    const blast = blastByService.get(svc) ?? 0;
    const blastScore = useBlast ? blast / maxBlast : 0;
    const score = useBlast
      ? ONSET_WEIGHT * onsetScore + BLAST_WEIGHT * blastScore
      : onsetScore;

    const serviceAnomalies = group.anomalies.filter((a) => a.service === svc);
    const why: string[] = [];
    if (svc === firstMover) why.push('First service to show anomaly in this window');
    for (const a of serviceAnomalies) {
      why.push(
        `${a.metric} spiked ${a.deltaPct > 0 ? '+' : ''}${Math.round(a.deltaPct)}% above rolling baseline`,
      );
      why.push(`Anomaly detected at ${a.timestamp}`);
    }
    if (useBlast) {
      why.push(`${blast} upstream service(s) affected`);
    }

    const confidence = confidenceFromScore(score);
    return { component: svc, confidence, why, score };
  });

  // Rank by final (possibly blended) score, highest first. Onset order is a
  // stable tiebreaker since `scored` is already in earliest-onset order.
  const candidates = scored
    .map((c, i) => ({ c, i }))
    .sort((x, y) => y.c.score - x.c.score || x.i - y.i)
    .map(({ c }) => c);

  return {
    id,
    startedAt: group.windowStart,
    severity,
    status: 'open',
    affectedServices: [...services],
    timeline,
    signals,
    changes,
    candidates,
  };
}
