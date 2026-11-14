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

`buildIncident` takes the group, co-anomalous services, and change events and produces
an `Incident`:

- **Timeline**: all signal and change entries sorted by timestamp (ascending).
- **Severity**: derived from the largest absolute `deltaPct` in the group.
  - `>= 200%` → `critical` · `>= 100%` → `high` · `>= 50%` → `medium` · else `low`
- **Candidates**: one per service that has an observed anomaly, ranked by **earliest anomaly onset**.
  - `score = 1 - (onsetOffsetMs / windowMs)`, clamped to `[0, 1]`
  - `confidence = confidenceFromScore(score)` (thresholds: ≥0.66 → high, ≥0.33 → medium, else low)
  - `why[]` lists the spike magnitude, timestamp, and (for rank-1) the "First service" marker.
  - Services passed in `services` with no observed anomaly are excluded from candidates.

## Parameters

| Parameter | Default | Where used | Effect |
|-----------|---------|------------|--------|
| `windowSize` | `10` | `detectAnomalies` | Number of past data points used as the rolling baseline |
| `thresholdPct` | `50` | `detectAnomalies` | Minimum % deviation from baseline mean to flag as anomalous |
| `maxGapMs` | `60000` | `groupByTimeWindow` | Max gap (ms) between consecutive anomalies before starting a new group |

## Confidence, Not Certainty

Confidence levels (`low` / `medium` / `high`) reflect how strongly the *observable evidence*
points to a candidate — not a definitive answer. The `why[]` array on each candidate lists
the raw signals so engineers can verify or dismiss the suggestion. The ranking algorithm is
intentionally transparent: earliest onset + largest deviation are the only inputs, and both
are shown directly in `why[]`.

Never treat a `high`-confidence candidate as a confirmed root cause. Always verify with
logs, traces, and deployment history.
