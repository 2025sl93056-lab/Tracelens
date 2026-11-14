/**
 * HTTP API contracts between the core API (Member 3) and the frontend (Member 4) — §6.4.
 *
 * These describe request/response bodies only; the api package owns routing,
 * and the frontend package owns the client that calls them.
 */

import type { Severity } from './incident.js';

export type UserRole = 'viewer' | 'admin';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
}

/** Compact incident shape for the list view (`GET /incidents`). */
export interface IncidentSummary {
  id: string;
  startedAt: string;
  severity: Severity;
  affectedServices: string[];
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  role: UserRole;
}

/** Canonical route paths the frontend calls. Keep in sync on both sides. */
export const API_ROUTES = {
  login: '/auth/login',
  users: '/auth/users',
  createUser: '/auth/register',
  incidents: '/incidents',
  incident: (id: string) => `/incidents/${id}`,
  services: '/services',
  graph: '/graph',
  impact: '/graph/impact',
} as const;
