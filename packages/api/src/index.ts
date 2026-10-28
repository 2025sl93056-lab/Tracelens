/**
 * api — the single REST API the frontend talks to.
 *
 * OWNER: Member 3 (Dependency Graph & Backend Platform)
 *
 * GOAL: expose incidents, services, and graph data to the dashboard, with JWT
 * login + simple RBAC (viewer/admin). API keys guard ingestion separately.
 *
 * TODO (issue + PR per item):
 *  - [x] POST /auth/login -> JWT; auth middleware + RBAC.
 *  - [x] GET /incidents, GET /incidents/:id (from correlation output).
 *  - [x] GET /services, GET /graph, GET /graph/impact (from graph service).
 *  - [x] Wire PostgreSQL data layer (shared with ingestion).
 *  - [ ] Dockerfile + health endpoint.
 *
 * `healthStatus` and `roleSatisfies` are the original tested starting points;
 * the app, auth, data layer, and seed live in sibling modules re-exported below.
 */
import { pathToFileURL } from 'node:url';
import type { Express } from 'express';
import type { UserRole } from '@tracelens/shared';
import { createDefaultApp } from './app.js';

export interface HealthStatus {
  status: 'ok';
  service: 'tracelens-api';
  version: string;
}

/** Payload returned by GET /health (used by Docker healthchecks). */
export function healthStatus(version = '0.1.0'): HealthStatus {
  return { status: 'ok', service: 'tracelens-api', version };
}

/** True if `role` satisfies the `required` role (admin implies viewer). */
export function roleSatisfies(role: UserRole, required: UserRole): boolean {
  if (required === 'viewer') return role === 'viewer' || role === 'admin';
  return role === 'admin';
}

export * from './db.js';
export * from './auth.js';
export * from './repository.js';
export * from './seed.js';
export * from './app.js';

/**
 * Start the HTTP server. Serves the seeded in-memory dataset out of the box; a
 * real PostgreSQL store can be swapped in later via the data layer in `db.ts`.
 */
export function startServer(env: NodeJS.ProcessEnv = process.env): ReturnType<Express['listen']> {
  const port = Number.parseInt(env.API_PORT ?? '4000', 10);
  const app = createDefaultApp(env);
  return app.listen(port, () => {
    process.stdout.write(`tracelens-api listening on :${port}\n`);
  });
}

// Run the server only when this module is executed directly (not when imported
// by tests or other packages).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
