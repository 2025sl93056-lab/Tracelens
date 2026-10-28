# TraceLens Core API

The single REST API the dashboard talks to. It serves incidents, services, and
the service dependency graph, and handles authentication (JWT) with simple
role-based access control (`viewer` / `admin`).

- **Base URL (dev):** `http://localhost:4000` (`API_PORT`, default `4000`)
- **Owner:** Member 3 — Dependency Graph & Backend Platform
- **Contracts:** request/response shapes come from
  [`@tracelens/shared`](../packages/shared/src/api.ts) (`API_ROUTES`, `LoginResponse`,
  `IncidentSummary`, `DependencyGraph`, `ImpactResult`, `Incident`).

## Running

```bash
npm run dev   --workspace packages/api   # watch mode (tsx)
npm run build --workspace packages/api && npm start --workspace packages/api
```

The API boots against a **seeded in-memory dataset** so it runs with no database
present. The PostgreSQL data layer (connection helper + schema migration) is
wired and ready in [`packages/api/src/db.ts`](../packages/api/src/db.ts) and
[`packages/api/migrations/001_init.sql`](../packages/api/migrations/001_init.sql);
a Postgres-backed `DataStore` can be swapped in without touching the routes.

## Authentication

`POST /auth/login` exchanges credentials for a signed JWT. Send it on every
protected request as a bearer token:

```
Authorization: Bearer <token>
```

Tokens are signed with `JWT_SECRET` (default `change-me-in-production` — **set a
real secret in production**) and expire after `JWT_EXPIRES_IN_SECONDS` (default
3600).

### Roles (RBAC)

| Role     | Can do                                                         |
| -------- | -------------------------------------------------------------- |
| `viewer` | Read incidents, services, graph, and impact.                   |
| `admin`  | Everything a viewer can, **plus** maintenance (graph rebuild). |

`admin` implies `viewer` (see `roleSatisfies` in `@tracelens/api`).

### Dev credentials

Seeded for local development (override via env — see below):

| Username | Password | Role     |
| -------- | -------- | -------- |
| `admin`  | `admin`  | `admin`  |
| `viewer` | `viewer` | `viewer` |

## Endpoints

### `GET /health` — _public_

Liveness probe used by Docker healthchecks.

```json
{ "status": "ok", "service": "tracelens-api", "version": "0.1.0" }
```

### `POST /auth/login` — _public_

**Body** (`LoginRequest`): `{ "username": string, "password": string }`

| Status | Meaning                                      |
| ------ | -------------------------------------------- |
| `200`  | `LoginResponse` → `{ token, role }`          |
| `400`  | `username`/`password` missing or not strings |
| `401`  | invalid credentials                          |

```bash
curl -X POST localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"viewer","password":"viewer"}'
# → { "token": "eyJ…", "role": "viewer" }
```

### `GET /auth/me` — _viewer_

Returns the authenticated principal: `{ "username": string, "role": "viewer" | "admin" }`.

### `GET /incidents` — _viewer_

Returns `IncidentSummary[]`, newest first:

```json
[
  {
    "id": "INC-1043",
    "startedAt": "2026-10-20T09:05:00.000Z",
    "severity": "medium",
    "affectedServices": ["inventory"]
  }
]
```

### `GET /incidents/:id` — _viewer_

Returns the full `Incident` (timeline, signals, changes, ranked candidates).

| Status | Meaning             |
| ------ | ------------------- |
| `200`  | `Incident`          |
| `404`  | unknown incident id |

### `GET /services` — _viewer_

Returns the `service` nodes of the dependency graph (`GraphNode[]`).

### `GET /graph` — _viewer_

Returns the `DependencyGraph` (`{ nodes, edges }`), derived from trace spans
(parent span → child span = `CALLS`).

### `GET /graph/impact?node=<id>` — _viewer_

Downstream impact from a node (BFS, cycle-safe). Returns `ImpactResult`:

```json
{ "node": "order", "affected": ["payment", "inventory", "db-sim"] }
```

| Status | Meaning                    |
| ------ | -------------------------- |
| `200`  | `ImpactResult`             |
| `400`  | `node` query param missing |

### `POST /graph/rebuild` — _admin_

Re-derives the dependency graph from trace spans (maintenance). Returns
`{ "nodes": number, "edges": number }`. Requires the `admin` role (`403` for a
viewer). Not part of the frontend route contract.

## Error responses

Errors are JSON `{ "error": string }` with an appropriate status:

| Status | When                                                            |
| ------ | --------------------------------------------------------------- |
| `400`  | malformed request (bad login body, missing `node`)              |
| `401`  | missing/malformed `Authorization` header, invalid/expired token |
| `403`  | authenticated but insufficient role                             |
| `404`  | unknown resource / route                                        |
| `500`  | unexpected server error                                         |

## Environment variables

| Variable                                      | Default                   | Purpose                         |
| --------------------------------------------- | ------------------------- | ------------------------------- |
| `API_PORT`                                    | `4000`                    | HTTP listen port                |
| `JWT_SECRET`                                  | `change-me-in-production` | JWT signing secret              |
| `JWT_EXPIRES_IN_SECONDS`                      | `3600`                    | Token lifetime                  |
| `AUTH_ADMIN_PASSWORD`                         | `admin`                   | Override seeded admin password  |
| `AUTH_VIEWER_PASSWORD`                        | `viewer`                  | Override seeded viewer password |
| `POSTGRES_HOST`/`PORT`/`USER`/`PASSWORD`/`DB` | local dev defaults        | Shared Postgres data layer      |
