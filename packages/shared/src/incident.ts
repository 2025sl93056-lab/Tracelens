/**
 * Incident contracts (§6.2).
 *
 * Produced by: correlation / incident engine (Member 2)
 * Consumed by: api (Member 3), frontend (Member 4)
 */

/** Incident severity, ordered low → critical. */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITY_LEVELS: readonly Severity[] = ['low', 'medium', 'high', 'critical'] as const;

/**
 * How strongly TraceLens believes a root-cause candidate.
 * Deliberately coarse — we present evidence, not certainty.
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** An entry on the incident timeline. */
export interface TimelineEntry {
  /** ISO-8601 timestamp. */
  at: string;
  kind: 'deploy' | 'signal' | 'change';
  text: string;
}

/** An anomalous signal observed during the incident. */
export interface Signal {
  /** Metric name, e.g. "payment.latency". */
  metric: string;
  /** Percent change versus the baseline, e.g. 312 means +312%. */
  deltaPct: number;
}

/** A change (deployment, config, migration, ...) correlated to the incident. */
export interface ChangeEvent {
  /** ISO-8601 timestamp. */
  at: string;
  text: string;
}

/** A ranked investigation candidate — NOT a definitive cause. */
export interface RootCauseCandidate {
  /** Component/version to investigate, e.g. "payment-service v4.3.1". */
  component: string;
  confidence: ConfidenceLevel;
  /** Human-readable evidence supporting this candidate. */
  why: string[];
  /** Optional raw score in [0, 1] used for ranking. */
  score?: number;
}

/** A correlated incident assembled by the incident engine. */
export interface Incident {
  /** Stable id, e.g. "INC-1042". */
  id: string;
  /** ISO-8601 time the incident started. */
  startedAt: string;
  severity: Severity;
  status: 'open' | 'resolved';
  affectedServices: string[];
  timeline: TimelineEntry[];
  signals: Signal[];
  changes: ChangeEvent[];
  /** Candidates ordered most-likely first. */
  candidates: RootCauseCandidate[];
}

/**
 * Map a raw correlation score in [0, 1] to a coarse confidence level.
 * Shared so the engine (Member 2) and the UI (Member 4) agree on thresholds.
 */
export function confidenceFromScore(score: number): ConfidenceLevel {
  if (score >= 0.66) return 'high';
  if (score >= 0.33) return 'medium';
  return 'low';
}
