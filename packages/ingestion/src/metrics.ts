import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method'],
  registers: [registry],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP requests that returned a 4xx or 5xx status',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const eventsIngestedTotal = new Counter({
  name: 'tracelens_events_ingested_total',
  help: 'Total number of telemetry events ingested',
  labelNames: ['type'],
  registers: [registry],
});

export const batchSizeHistogram = new Histogram({
  name: 'tracelens_batch_size',
  help: 'Number of events per batch ingestion request',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

export const batchValidationErrors = new Counter({
  name: 'tracelens_batch_validation_errors_total',
  help: 'Total number of event validation errors in batch ingestion',
  registers: [registry],
});

export const ingestRejectedTotal = new Counter({
  name: 'tracelens_ingest_rejected_total',
  help: 'Total number of ingestion requests rejected (auth, size, validation)',
  labelNames: ['reason'],
  registers: [registry],
});
