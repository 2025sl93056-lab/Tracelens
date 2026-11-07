# Observability — Prometheus & Grafana

TraceLens ships with a built-in observability stack: Prometheus collects metrics from the API and ingestion services; Grafana provides pre-built dashboards.

## Quick start

```bash
docker compose up --build
```

| Service | URL | Credentials |
|---|---|---|
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |

> Change the Grafana admin password via the `GF_SECURITY_ADMIN_PASSWORD` env var (see `.env.example`).

## Metrics endpoints

Both application services expose Prometheus metrics at `GET /metrics`:

| Service | URL (default) |
|---|---|
| API | http://localhost:4000/metrics |
| Ingestion | http://localhost:4001/metrics |

The `/metrics` endpoint is **public** (no auth required) — restrict network access in production.

## Dashboards

Three dashboards are provisioned automatically on first Grafana start:

### API & Telemetry Metrics (`tracelens-api-metrics`)

- HTTP requests per second (by job + route)
- HTTP request latency (p50 / p95 / p99)
- Error rate (5xx responses)
- Events ingested per second (by type)
- Batch size distribution (p50 / p95)
- Node.js heap usage gauge

### Incidents (`tracelens-incidents`)

- Total / critical / high / medium+low incident gauges
- Incidents created over time (by severity)

### Service Health (`tracelens-service-health`)

- Up/down status per service (scraped from Prometheus `up` metric)
- Node.js heap used vs total
- CPU usage
- Active handles & requests
- Process uptime

## Custom metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests (both services) |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request duration in seconds |
| `tracelens_incidents_total` | Counter | `severity` | Incidents created by the correlation engine |
| `tracelens_events_ingested_total` | Counter | `type` | Telemetry events ingested |
| `tracelens_batch_size` | Histogram | — | Number of events per batch request |

Default Node.js process metrics (`nodejs_*`, `process_*`) are also exported via `prom-client`'s `collectDefaultMetrics`.

## Configuring Prometheus scrape targets

Edit `monitoring/prometheus.yml` to add or remove scrape targets. By default it scrapes:

```yaml
scrape_configs:
  - job_name: tracelens-api
    static_configs:
      - targets: ['api:4000']
    metrics_path: /metrics

  - job_name: tracelens-ingestion
    static_configs:
      - targets: ['ingestion:4001']
    metrics_path: /metrics
```

## Adding dashboards

Place Grafana dashboard JSON files in `monitoring/grafana/dashboards/`. They are provisioned automatically via the file provider configured in `monitoring/grafana/provisioning/dashboards/dashboard.yml`. The `uid` field in each JSON must be unique.

## Adding alerting rules (next steps)

Prometheus alerting rules can be added to `monitoring/` as `*.rules.yml` files and referenced in `prometheus.yml` under `rule_files`. Grafana can also send alerts via its Alerting UI — connect it to a notification channel (Slack, PagerDuty, email) under **Alerting → Contact points**.
