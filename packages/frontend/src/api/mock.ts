import type { IncidentSummary, Incident, DependencyGraph, ImpactResult, CreateUserResponse } from '@tracelens/shared';

export const MOCK_USERS: CreateUserResponse[] = [
  { id: 'u1', username: 'admin', role: 'admin' },
  { id: 'u2', username: 'alice', role: 'viewer' },
  { id: 'u3', username: 'bob', role: 'viewer' },
];

export function addMockUser(user: CreateUserResponse) {
  MOCK_USERS.push(user);
}

export const MOCK_INCIDENTS: IncidentSummary[] = [
  {
    id: 'INC-1042',
    startedAt: '2026-10-27T10:14:00Z',
    severity: 'critical',
    affectedServices: ['payment-service', 'order-service'],
  },
  {
    id: 'INC-1041',
    startedAt: '2026-10-27T08:02:00Z',
    severity: 'high',
    affectedServices: ['inventory-service'],
  },
  {
    id: 'INC-1040',
    startedAt: '2026-10-26T22:30:00Z',
    severity: 'medium',
    affectedServices: ['notification-service'],
  },
];

export const MOCK_INCIDENT_DETAIL: Record<string, Incident> = {
  'INC-1042': {
    id: 'INC-1042',
    startedAt: '2026-10-27T10:14:00Z',
    severity: 'critical',
    affectedServices: ['payment-service', 'order-service'],
    timeline: [
      { at: '2026-10-27T10:00:00Z', kind: 'deploy', text: 'payment-service v4.3.1 deployed to production' },
      { at: '2026-10-27T10:08:00Z', kind: 'signal', text: 'payment.latency p99 crossed 2000ms threshold' },
      { at: '2026-10-27T10:12:00Z', kind: 'signal', text: 'order-service error rate exceeded 5%' },
      { at: '2026-10-27T10:14:00Z', kind: 'change', text: 'Incident INC-1042 opened automatically' },
    ],
    signals: [
      { metric: 'payment.latency.p99', deltaPct: 312 },
      { metric: 'order-service.error_rate', deltaPct: 820 },
      { metric: 'payment.throughput', deltaPct: -68 },
    ],
    changes: [
      { at: '2026-10-27T10:00:00Z', text: 'payment-service v4.3.1 deployed (PR #241 — retry logic refactor)' },
      { at: '2026-10-27T09:45:00Z', text: 'DB connection pool size reduced 100 → 20 (config change)' },
    ],
    candidates: [
      {
        component: 'payment-service v4.3.1',
        confidence: 'high',
        why: [
          'Deployed 14 min before incident start',
          'payment.latency p99 +312% immediately post-deploy',
          'No other services deployed in the same window',
        ],
      },
      {
        component: 'DB connection pool config',
        confidence: 'medium',
        why: [
          'Pool reduced 29 min before incident',
          'Correlated with payment throughput drop (−68%)',
        ],
      },
    ],
  },
  'INC-1041': {
    id: 'INC-1041',
    startedAt: '2026-10-27T08:02:00Z',
    severity: 'high',
    affectedServices: ['inventory-service'],
    timeline: [
      { at: '2026-10-27T07:55:00Z', kind: 'deploy', text: 'inventory-service v2.1.0 deployed' },
      { at: '2026-10-27T08:02:00Z', kind: 'signal', text: 'inventory.sync_lag exceeded 120 s' },
    ],
    signals: [{ metric: 'inventory.sync_lag_seconds', deltaPct: 450 }],
    changes: [
      { at: '2026-10-27T07:55:00Z', text: 'inventory-service v2.1.0 deployed (PR #238 — bulk import optimization)' },
    ],
    candidates: [
      {
        component: 'inventory-service v2.1.0',
        confidence: 'high',
        why: ['Deployed 7 min before sync-lag spike', 'PR #238 touched batch-job scheduler'],
      },
    ],
  },
  'INC-1040': {
    id: 'INC-1040',
    startedAt: '2026-10-26T22:30:00Z',
    severity: 'medium',
    affectedServices: ['notification-service'],
    timeline: [
      { at: '2026-10-26T22:30:00Z', kind: 'signal', text: 'notification delivery failure rate > 2%' },
    ],
    signals: [{ metric: 'notification.delivery_failures', deltaPct: 180 }],
    changes: [],
    candidates: [
      {
        component: 'smtp-gateway',
        confidence: 'low',
        why: ['SMTP gateway reported elevated queue depth around incident time'],
      },
    ],
  },
};

export const MOCK_GRAPH: DependencyGraph = {
  nodes: [
    { id: 'svc:frontend', kind: 'service', label: 'frontend' },
    { id: 'svc:api-gateway', kind: 'api', label: 'api-gateway' },
    { id: 'svc:order-service', kind: 'service', label: 'order-service' },
    { id: 'svc:payment-service', kind: 'service', label: 'payment-service' },
    { id: 'svc:inventory-service', kind: 'service', label: 'inventory-service' },
    { id: 'svc:notification-service', kind: 'service', label: 'notification-service' },
    { id: 'db:orders', kind: 'database', label: 'orders-db' },
    { id: 'db:payments', kind: 'database', label: 'payments-db' },
    { id: 'db:inventory', kind: 'database', label: 'inventory-db' },
  ],
  edges: [
    { from: 'svc:frontend', to: 'svc:api-gateway', kind: 'CALLS' },
    { from: 'svc:api-gateway', to: 'svc:order-service', kind: 'CALLS' },
    { from: 'svc:api-gateway', to: 'svc:payment-service', kind: 'CALLS' },
    { from: 'svc:api-gateway', to: 'svc:inventory-service', kind: 'CALLS' },
    { from: 'svc:order-service', to: 'svc:payment-service', kind: 'DEPENDS_ON' },
    { from: 'svc:order-service', to: 'svc:notification-service', kind: 'CALLS' },
    { from: 'svc:order-service', to: 'db:orders', kind: 'DEPENDS_ON' },
    { from: 'svc:payment-service', to: 'db:payments', kind: 'DEPENDS_ON' },
    { from: 'svc:inventory-service', to: 'db:inventory', kind: 'DEPENDS_ON' },
  ],
};

export const MOCK_IMPACT: Record<string, ImpactResult> = {
  'svc:payment-service': {
    node: 'svc:payment-service',
    affected: ['svc:order-service', 'svc:notification-service', 'svc:api-gateway', 'svc:frontend'],
  },
  'svc:api-gateway': {
    node: 'svc:api-gateway',
    affected: ['svc:order-service', 'svc:payment-service', 'svc:inventory-service', 'svc:notification-service'],
  },
  'svc:order-service': {
    node: 'svc:order-service',
    affected: ['svc:notification-service', 'db:orders'],
  },
};
