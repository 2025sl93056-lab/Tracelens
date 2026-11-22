# Correlation & Incident Intelligence

TraceLens detects anomalies in telemetry, correlates them across services, and assembles
an `Incident` with a timeline and ranked root-cause candidates. Every candidate carries a
**confidence level**, not a certainty — the system surfaces evidence for engineers to verify.

## Algorithm

### 1. Rolling-Baseline Anomaly Detection (`anomaly.ts`)

For each `(service, metric)` pair, TraceLens maintains a sliding window of the last
`windowSize` (default: 10) observed values. Each incoming metric event is tested against
`isAnomalous(current, window, thresholdPct)`:

```
deltaPct = (current - mean(window)) / mean(window) × 100
anomalous = |deltaPct| >= thresholdPct
```

Only anomalous points are emitted as `AnomalyResult` objects for the next stage.

### 2. Temporal Correlation (`temporalCorrelation.ts`)

`AnomalyResult[]` is sorted by timestamp and grouped into `AnomalyGroup[]` using a
**sliding-gap algorithm**: a new group starts whenever the gap between consecutive
anomalies exceeds `maxGapMs` (default: 60,000 ms). Note that a group can span more than
`maxGapMs` total if each consecutive pair is within the threshold.

### 3. Service Correlation (`serviceCorrelation.ts`)

Within each `AnomalyGroup`, all distinct services are extracted as the **co-anomalous
service set**. No dependency-graph lookup is required — temporal co-occurrence is the signal.

### 4. What Changed (`whatChanged.ts`)

`deploy` and `config_change` telemetry events whose timestamps fall within
`[windowStart, windowEnd]` are collected as `ChangeEvent[]`. They appear on the incident
timeline as context, but do not affect candidate ranking in v1.

### 5. Incident Assembly (`incidentFactory.ts`)

`buildIncident` takes the group, co-anomalous services, change events, and an
optional dependency graph and produces an `Incident`:

- **Timeline**: all signal and change entries sorted by timestamp (ascending).
- **Severity**: derived from the largest absolute `deltaPct` in the group.
  - `>= 200%` → `critical` · `>= 100%` → `high` · `>= 50%` → `medium` · else `low`
- **Candidates**: one per service that has an observed anomaly, ranked by score.
  - `onsetScore = 1 - (onsetOffsetMs / windowMs)`, clamped to `[0, 1]`
  - When a dependency graph is supplied, the score blends onset with
    **blast radius** (see step 6); otherwise it is `onsetScore` alone.
  - `confidence = confidenceFromScore(score)` (thresholds: ≥0.66 → high, ≥0.33 → medium, else low)
  - `why[]` lists the spike magnitude, timestamp, the "First service" marker
    (for the earliest-onset service), and — when a graph is present — the
    number of upstream services affected.
  - Services passed in `services` with no observed anomaly are excluded from candidates.

### 6. Graph-Impact Enrichment (optional)

The end-to-end pipeline (`runCorrelation`) derives a service dependency graph
from the trace spans in the same telemetry stream (`deriveGraphFromSpans`) and
passes it to `buildIncident`. For each candidate service, **blast radius** is
the number of upstream dependents — services that would be affected if this one
degraded, via `upstreamImpact`. The final score blends two signals:

```
score = 0.7 × onsetScore + 0.3 × blastScore
blastScore = blastRadius / maxBlastRadiusAmongCandidates
```

Onset deliberately dominates: the service that broke **first** is the strongest
causal signal, so blast radius acts as a tiebreaker that lifts a high-impact
service when onset times are close. The earliest-onset service always keeps its
"First service to show anomaly" marker, even if blast-radius weighting reorders
the ranking — so the evidence stays transparent.

If no graph is supplied, or the graph yields zero blast radius for every
candidate (e.g. a stream with no trace spans), ranking falls back to onset only.
Enrichment is strictly additive: it never removes a candidate or changes severity.

## Pipeline

`runCorrelation(events, options?)` chains all stages into a single call, turning
a raw `TelemetryEvent[]` stream into `Incident[]` — one incident per temporally
grouped burst of anomalies:

```
detectAnomalies → groupByTimeWindow → (per group) findCoAnomalousServices
  + collectChanges + deriveGraphFromSpans → buildIncident
```

It also widens the change-search window backwards by `changeLookbackMs` so a
deploy or config change landing just before anomaly onset — the classic "bad
deployment" cause — is attached to the incident rather than missed by the raw
anomaly window.

## Parameters

| Parameter | Default | Where used | Effect |
|-----------|---------|------------|--------|
| `windowSize` | `10` | `detectAnomalies` | Number of past data points used as the rolling baseline |
| `thresholdPct` | `50` | `detectAnomalies` | Minimum % deviation from baseline mean to flag as anomalous |
| `maxGapMs` | `60000` | `groupByTimeWindow` | Max gap (ms) between consecutive anomalies before starting a new group |
| `changeLookbackMs` | `300000` | `runCorrelation` | How far before a window to search for deploy/config changes |

## Confidence, Not Certainty

Confidence levels (`low` / `medium` / `high`) reflect how strongly the *observable evidence*
points to a candidate — not a definitive answer. The `why[]` array on each candidate lists
the raw signals so engineers can verify or dismiss the suggestion. The ranking algorithm is
intentionally transparent: earliest onset, largest deviation, and (when a dependency graph is
available) upstream blast radius are the only inputs, and all are shown directly in `why[]`.

Never treat a `high`-confidence candidate as a confirmed root cause. Always verify with
logs, traces, and deployment history.
