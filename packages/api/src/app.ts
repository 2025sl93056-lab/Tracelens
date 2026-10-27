/**
 * Express application factory for the core API (M3).
 *
 * `createApp` wires the routes against injected dependencies (data store + auth
 * config) so it is trivial to test and to re-point at a Postgres-backed store.
 * Route paths come from the shared `API_ROUTES` contract wherever the frontend
 * calls them, keeping both sides in lock-step.
 *
 * Auth model:
 *   - `GET /health`          public (used by Docker healthchecks)
 *   - `POST /auth/login`     public (exchanges credentials for a JWT)
 *   - all data routes        require the `viewer` role (any authenticated user)
 *   - `POST /graph/rebuild`  requires the `admin` role (maintenance)
 */
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { API_ROUTES, type LoginResponse } from '@tracelens/shared';
import { healthStatus, type HealthStatus } from './index.js';
import {
  authenticate,
  issueToken,
  loadAuthConfigFromEnv,
  requireRole,
  type AuthConfig,
} from './auth.js';
import { InMemoryDataStore, type DataStore } from './repository.js';

/** Dependencies injected into {@link createApp}. */
export interface AppDeps {
  store: DataStore;
  auth: AuthConfig;
  /** Version string reported by `GET /health`. */
  version?: string;
}

export function createApp(deps: AppDeps): Express {
  const { store, auth, version } = deps;
  const app = express();
  app.use(express.json());

  // --- Health (public) ------------------------------------------------------
  app.get('/health', (_req: Request, res: Response<HealthStatus>) => {
    res.json(healthStatus(version));
  });

  // --- Auth (public) --------------------------------------------------------
  app.post(API_ROUTES.login, (req: Request, res: Response) => {
    const body = req.body as { username?: unknown; password?: unknown } | undefined;
    const username = body?.username;
    const password = body?.password;
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }
    const user = authenticate(auth, username, password);
    if (!user) {
      res.status(401).json({ error: 'invalid credentials' });
      return;
    }
    const payload: LoginResponse = { token: issueToken(auth, user), role: user.role };
    res.json(payload);
  });

  // --- Who am I (viewer) ----------------------------------------------------
  app.get('/auth/me', requireRole(auth, 'viewer'), (req: Request, res: Response) => {
    res.json(req.user);
  });

  // --- Incidents (viewer) ---------------------------------------------------
  app.get(API_ROUTES.incidents, requireRole(auth, 'viewer'), (_req: Request, res: Response) => {
    res.json(store.listIncidents());
  });

  app.get(
    `${API_ROUTES.incidents}/:id`,
    requireRole(auth, 'viewer'),
    (req: Request, res: Response) => {
      const incident = store.getIncident(req.params.id);
      if (!incident) {
        res.status(404).json({ error: `incident ${req.params.id} not found` });
        return;
      }
      res.json(incident);
    },
  );

  // --- Services (viewer) ----------------------------------------------------
  app.get(API_ROUTES.services, requireRole(auth, 'viewer'), (_req: Request, res: Response) => {
    res.json(store.listServices());
  });

  // --- Graph (viewer) -------------------------------------------------------
  app.get(API_ROUTES.graph, requireRole(auth, 'viewer'), (_req: Request, res: Response) => {
    res.json(store.getGraph());
  });

  app.get(API_ROUTES.impact, requireRole(auth, 'viewer'), (req: Request, res: Response) => {
    const node = req.query.node;
    if (typeof node !== 'string' || node.length === 0) {
      res.status(400).json({ error: 'query parameter "node" is required' });
      return;
    }
    res.json(store.getImpact(node));
  });

  // --- Graph maintenance (admin) -------------------------------------------
  app.post('/graph/rebuild', requireRole(auth, 'admin'), (_req: Request, res: Response) => {
    const graph = store.rebuildGraph();
    res.json({ nodes: graph.nodes.length, edges: graph.edges.length });
  });

  // --- Fallbacks ------------------------------------------------------------
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'internal error';
    res.status(500).json({ error: message });
  });

  return app;
}

/**
 * Build an app with the default seeded in-memory store and env-derived auth.
 * The entry point in `index.ts` uses this to start the server.
 */
export function createDefaultApp(env: NodeJS.ProcessEnv = process.env): Express {
  return createApp({
    store: new InMemoryDataStore(),
    auth: loadAuthConfigFromEnv(env),
    version: env.npm_package_version ?? '0.1.0',
  });
}
