/**
 * Authentication & RBAC for the core API (M3).
 *
 * OWNER: Member 3 (Dependency Graph & Backend Platform)
 *
 * `POST /auth/login` exchanges credentials for a short-lived JWT carrying the
 * user's role. Every protected route then runs {@link requireRole}, which
 * verifies the token and checks the role with the shared {@link roleSatisfies}
 * rule (admin implies viewer).
 *
 * The user store is intentionally a tiny in-memory map seeded with dev
 * credentials — this issue delivers the auth *plumbing*, not an identity
 * provider. Passwords are compared in constant time and never logged. Override
 * the dev passwords and (crucially) `JWT_SECRET` via environment variables in
 * any real deployment.
 */
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UserRole } from '@tracelens/shared';
import { roleSatisfies } from './index.js';

/** The authenticated principal attached to a request after auth succeeds. */
export interface AuthUser {
  username: string;
  role: UserRole;
}

// Make `req.user` available to downstream handlers in a type-safe way.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface StoredUser {
  password: string;
  role: UserRole;
}

/** Runtime auth configuration: signing secret, token lifetime, and users. */
export interface AuthConfig {
  secret: string;
  /** Token lifetime in seconds. */
  expiresInSeconds: number;
  users: Map<string, StoredUser>;
}

const DEFAULT_SECRET = 'change-me-in-production';
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/**
 * Build {@link AuthConfig} from the environment. Falls back to dev defaults:
 * users `admin`/`admin` (admin) and `viewer`/`viewer` (viewer). Individual
 * passwords can be overridden with `AUTH_ADMIN_PASSWORD` / `AUTH_VIEWER_PASSWORD`.
 */
export function loadAuthConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const users = new Map<string, StoredUser>([
    ['admin', { password: env.AUTH_ADMIN_PASSWORD ?? 'admin', role: 'admin' }],
    ['viewer', { password: env.AUTH_VIEWER_PASSWORD ?? 'viewer', role: 'viewer' }],
  ]);
  const expires = Number.parseInt(env.JWT_EXPIRES_IN_SECONDS ?? '', 10);
  return {
    secret: env.JWT_SECRET ?? DEFAULT_SECRET,
    expiresInSeconds: Number.isNaN(expires) ? DEFAULT_EXPIRES_IN_SECONDS : expires,
    users,
  };
}

/** Constant-time string comparison that is safe for differing lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate credentials against the user store.
 * @returns the authenticated user, or `null` if the credentials are invalid.
 */
export function authenticate(
  config: AuthConfig,
  username: string,
  password: string,
): AuthUser | null {
  const stored = config.users.get(username);
  // Always run a comparison to avoid leaking which usernames exist via timing.
  const reference = stored?.password ?? '';
  const ok = safeEqual(password, reference);
  if (!stored || !ok) return null;
  return { username, role: stored.role };
}

/** Sign a JWT for an authenticated user. Role travels in the payload. */
export function issueToken(config: AuthConfig, user: AuthUser): string {
  return jwt.sign({ role: user.role }, config.secret, {
    subject: user.username,
    expiresIn: config.expiresInSeconds,
  });
}

/**
 * Verify and decode a bearer token.
 * @returns the user it represents, or `null` if missing/expired/tampered.
 */
export function verifyToken(config: AuthConfig, token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.secret);
    if (typeof payload !== 'object' || payload === null) return null;
    const { sub, role } = payload as { sub?: unknown; role?: unknown };
    if (typeof sub !== 'string') return null;
    if (role !== 'viewer' && role !== 'admin') return null;
    return { username: sub, role };
  } catch {
    return null;
  }
}

/** Extract a bearer token from an `Authorization: Bearer <token>` header. */
function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/**
 * Express middleware enforcing authentication AND the minimum `required` role.
 * Responds `401` when the token is missing/invalid and `403` when the caller is
 * authenticated but under-privileged. On success it attaches `req.user`.
 */
export function requireRole(config: AuthConfig, required: UserRole): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'missing or malformed Authorization header' });
      return;
    }
    const user = verifyToken(config, token);
    if (!user) {
      res.status(401).json({ error: 'invalid or expired token' });
      return;
    }
    if (!roleSatisfies(user.role, required)) {
      res.status(403).json({ error: `requires ${required} role` });
      return;
    }
    req.user = user;
    next();
  };
}
