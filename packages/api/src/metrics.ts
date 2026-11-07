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

export const authFailuresTotal = new Counter({
  name: 'tracelens_auth_failures_total',
  help: 'Total number of failed authentication attempts',
  labelNames: ['reason'],
  registers: [registry],
});

export const incidentsTotal = new Counter({
  name: 'tracelens_incidents_total',
  help: 'Total number of incidents created',
  labelNames: ['severity'],
  registers: [registry],
});

export const activeIncidents = new Gauge({
  name: 'tracelens_active_incidents',
  help: 'Current number of open incidents by severity',
  labelNames: ['severity'],
  registers: [registry],
});
