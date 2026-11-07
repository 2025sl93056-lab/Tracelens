import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

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
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
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
  buckets: [1, 10, 50, 100, 250, 500, 1000],
  registers: [registry],
});
