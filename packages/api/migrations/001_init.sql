-- TraceLens core schema — migration 001 (M3).
--
-- The shared PostgreSQL data layer for the core API and the ingestion service
-- (see docs/ARCHITECTURE.md). Mirrors the @tracelens/shared contracts:
--   services / edges   ↔ DependencyGraph (§6.3)
--   telemetry          ↔ TelemetryEvent  (§6.1)
--   incidents          ↔ Incident        (§6.2)
--
-- Idempotent: every statement uses IF NOT EXISTS so it is safe to run on boot.

-- Service dependency graph: nodes ------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id         TEXT PRIMARY KEY,                 -- e.g. "payment-service"
  label      TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'service',  -- NodeKind
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service dependency graph: edges ------------------------------------------
CREATE TABLE IF NOT EXISTS edges (
  from_id TEXT NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  to_id   TEXT NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  kind    TEXT NOT NULL,                        -- EdgeKind: CALLS / DEPENDS_ON / ...
  PRIMARY KEY (from_id, to_id, kind)
);

-- Raw telemetry ingested from services -------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
  id             BIGSERIAL PRIMARY KEY,
  type           TEXT NOT NULL,                 -- TelemetryType
  service        TEXT NOT NULL,
  ts             TIMESTAMPTZ NOT NULL,          -- event timestamp
  name           TEXT NOT NULL,
  value          DOUBLE PRECISION,
  trace_id       TEXT,
  span_id        TEXT,
  parent_span_id TEXT,
  attributes     JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telemetry_service_ts_idx ON telemetry (service, ts);
CREATE INDEX IF NOT EXISTS telemetry_trace_idx ON telemetry (trace_id);
CREATE INDEX IF NOT EXISTS telemetry_span_idx ON telemetry (span_id);

-- Correlated incidents -------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id                TEXT PRIMARY KEY,           -- e.g. "INC-1042"
  started_at        TIMESTAMPTZ NOT NULL,
  severity          TEXT NOT NULL,              -- Severity
  affected_services TEXT[] NOT NULL DEFAULT '{}',
  timeline          JSONB NOT NULL DEFAULT '[]'::jsonb,
  signals           JSONB NOT NULL DEFAULT '[]'::jsonb,
  changes           JSONB NOT NULL DEFAULT '[]'::jsonb,
  candidates        JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS incidents_started_at_idx ON incidents (started_at DESC);
