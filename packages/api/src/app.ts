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
import cors from 'cors';
import morgan from 'morgan';
import {
  API_ROUTES,
  type ImpactDirection,
  type IncidentListResponse,
  type LoginResponse,
  SEVERITY_LEVELS,
} from '@tracelens/shared';
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
  /** Max JSON request body size (e.g. '256kb'). Defaults to MAX_BODY_SIZE env var or '256kb'. */
  maxBodySize?: string;
  /** Allowed CORS origins. Defaults to CORS_ALLOWED_ORIGINS env var or 'http://localhost:5173'. */
  corsOrigins?: string[];
}

export function createApp(deps: AppDeps): Express {
  const { store, auth, version, maxBodySize, corsOrigins } = deps;
  const app = express();

  const allowedOrigins =
    corsOrigins ??
    (process.env['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no Origin header) and listed origins.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: maxBodySize ?? process.env['MAX_BODY_SIZE'] ?? '256kb' }));
  if (process.env['NODE_ENV'] !== 'test') {
    app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));
  }

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
  const MAX_LIMIT = 200;
  const DEFAULT_LIMIT = 50;

  app.get(API_ROUTES.incidents, requireRole(auth, 'viewer'), (req: Request, res: Response<IncidentListResponse | { error: string }>) => {
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const rawSeverity = req.query.severity;
    const rawStatus = req.query.status;

    let limit = DEFAULT_LIMIT;
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < 1) {
        res.status(400).json({ error: '"limit" must be a positive integer' });
        return;
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    let offset = 0;
    if (rawOffset !== undefined) {
      const parsed = Number(rawOffset);
      if (!Number.isInteger(parsed) || parsed < 0) {
        res.status(400).json({ error: '"offset" must be a non-negative integer' });
        return;
      }
      offset = parsed;
    }

    let severity: import('@tracelens/shared').Severity | undefined;
    if (rawSeverity !== undefined) {
      if (!SEVERITY_LEVELS.includes(rawSeverity as import('@tracelens/shared').Severity)) {
        res.status(400).json({ error: `"severity" must be one of: ${SEVERITY_LEVELS.join(', ')}` });
        return;
      }
      severity = rawSeverity as import('@tracelens/shared').Severity;
    }

    let status: 'open' | 'resolved' | undefined;
    if (rawStatus !== undefined) {
      if (rawStatus !== 'open' && rawStatus !== 'resolved') {
        res.status(400).json({ error: '"status" must be "open" or "resolved"' });
        return;
      }
      status = rawStatus;
    }

    res.json(store.listIncidentsPaginated({ limit, offset, severity, status }));
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
    const directionParam = req.query.direction;
    let direction: ImpactDirection = 'downstream';
    if (directionParam !== undefined) {
      if (directionParam !== 'downstream' && directionParam !== 'upstream') {
        res
          .status(400)
          .json({ error: 'query parameter "direction" must be "downstream" or "upstream"' });
        return;
      }
      direction = directionParam;
    }
    if (!store.getGraph().nodes.some((n) => n.id === node)) {
      res.status(404).json({ error: `node ${node} not found in the graph` });
      return;
    }
    res.json(store.getImpact(node, direction));
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
    if (
      err instanceof Error &&
      'status' in err &&
      (err as { status: number }).status === 413
    ) {
      res.status(413).json({ error: 'request body too large' });
      return;
    }
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
