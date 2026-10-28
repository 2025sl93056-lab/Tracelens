# @tracelens/ingestion

**Owner:** Member 1 — Telemetry & Demo Environment

HTTP ingestion API for TraceLens. Accepts `TelemetryEvent`s, validates them against
`@tracelens/shared`, and persists them to PostgreSQL.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | none | Docker health check |
| `POST` | `/telemetry` | API key | Ingest a single event; returns `{ id }` |
| `POST` | `/telemetry/batch` | API key | Ingest an array of events; returns `{ ids }` |

### Authentication

Pass the key as either:
- `x-api-key: <key>` header
- `Authorization: Bearer <key>` header

### Example

```bash
curl -X POST http://localhost:4001/telemetry \
  -H 'x-api-key: dev-ingest-key' \
  -H 'Content-Type: application/json' \
  -d '{"type":"metric","service":"payment-service","timestamp":"2026-10-18T14:32:18.000Z","name":"http.latency.ms","value":1240}'
# → {"id":1}
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `INGESTION_PORT` | `4001` | Port to listen on |
| `INGESTION_API_KEY` | `dev-ingest-key` | API key clients must supply |
| `POSTGRES_HOST` | `localhost` | Postgres host |
| `POSTGRES_PORT` | `5432` | Postgres port |
| `POSTGRES_DB` | `tracelens` | Database name |
| `POSTGRES_USER` | `tracelens` | Database user |
| `POSTGRES_PASSWORD` | `tracelens` | Database password |

## Running locally

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Run the service in watch mode
POSTGRES_HOST=localhost npm run dev --workspace packages/ingestion
```

Or run the full stack (Postgres + ingestion together):

```bash
docker compose up --build ingestion
```

## Running tests

Unit tests (no Postgres required):
```bash
npm test
```

Integration tests (requires Postgres):
```bash
docker compose up -d postgres
POSTGRES_HOST=localhost npm test
```

## Database schema

The service auto-creates the `telemetry_events` table on startup via `ensureSchema()`:

```sql
CREATE TABLE IF NOT EXISTS telemetry_events (
  id             BIGSERIAL PRIMARY KEY,
  type           TEXT        NOT NULL,
  service        TEXT        NOT NULL,
  event_ts       TIMESTAMPTZ NOT NULL,
  name           TEXT        NOT NULL,
  value          DOUBLE PRECISION,
  trace_id       TEXT,
  span_id        TEXT,
  parent_span_id TEXT,
  attributes     JSONB,
  inserted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
