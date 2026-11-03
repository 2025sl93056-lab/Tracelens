# TraceLens

**From Alert to Root Cause.**

TraceLens is an open-source, evidence-driven **incident intelligence and root-cause investigation** tool for distributed systems. It ingests telemetry (logs, metrics, traces) and change events (deployments, config changes), automatically detects incidents, builds an **incident timeline**, correlates it with **recent changes ("What changed?")**, and renders a **service dependency graph** so engineers can move from _alert → evidence → probable cause → affected components_.

> **Design principle:** TraceLens never claims _"this change caused the incident."_ It surfaces **evidence and correlation with a confidence level** and ranks **investigation candidates**. Engineers stay in control of the conclusion.

---

## Why TraceLens?

During an incident, engineers waste precious time manually stitching together logs, metrics, traces, and the list of things that recently changed. TraceLens does that correlation automatically and presents a single, explainable view:

```text
INCIDENT #1042  ·  started 14:32:18  ·  severity: high

Affected:        checkout · payment · order
Recent changes:  14:27  payment-service v4.3.1 deployed
                 14:28  DB connection pool 50 → 20
Signals:         +312% payment latency · +184% HTTP 5xx · +91% DB wait
Correlation:     HIGH
Investigate:     payment-service v4.3.1  (confidence: medium)
```

## Key features (MVP)

- **Telemetry ingestion** — OpenTelemetry-compatible logs, metrics, traces, and change events.
- **Anomaly detection** — threshold + rolling-baseline detection.
- **Correlation** — temporal, service-level, and deployment/change ("What changed?") correlation.
- **Incident engine** — automatic incident creation, timeline generation, ranked root-cause candidates with confidence.
- **Dependency graph** — service dependency graph derived from traces, with impact analysis.
- **Dashboard** — incident list, incident detail (timeline + evidence), and dependency-graph visualization.
- **Built-in demo environment** — a set of demo microservices with a fault-injection switch, so you can trigger realistic incidents on demand.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and [docs/ROADMAP.md](docs/ROADMAP.md) for what is intentionally out of scope.

## Tech stack

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Backend services | Node.js + TypeScript (Express) |
| Frontend         | React + TypeScript (Vite)      |
| Storage          | PostgreSQL                     |
| Packaging / run  | Docker + Docker Compose        |
| Tests            | Vitest                         |
| CI               | GitHub Actions                 |

## Repository layout

This is an npm-workspaces monorepo:

```text
packages/
  shared/          Shared TypeScript types & schemas (the contracts between modules)
  demo-services/   Demo microservices + fault injection (telemetry source)
  ingestion/       Telemetry ingestion API + persistence
  correlation/     Anomaly detection, correlation & incident engine
  graph/           Service dependency graph + impact analysis
  api/             Core REST API + auth (serves the frontend)
  frontend/        React dashboard
```

## Getting started

### Prerequisites

- Node.js **>= 20** and npm **>= 10**
- Docker + Docker Compose (for the full one-command run)

### Install

```bash
git clone <your-repo-url> tracelens
cd tracelens
npm install
```

### Run everything (Docker)

```bash
cp .env.example .env
docker compose up --build
# Dashboard:    http://localhost:5173
# Core API:     http://localhost:4000
# Ingestion:    http://localhost:4001
```

The stack includes Postgres, Adminer, ingestion, the API, and the dashboard. Sign in to the local
dashboard with the demo account `admin` / `admin` (or `viewer` / `viewer`); **Try demo** instead uses
browser mock data and does not verify the API connection.

The frontend image serves the production build on port 5173. Browser requests use the dashboard's
same-origin `/api` route, which Nginx forwards to `api:4000` on the Compose network. The browser does
not need to resolve Docker service names or make cross-origin API requests. `API_PORT` changes the
API's published host port; its internal port remains 4000. `FRONTEND_PORT` changes the dashboard's
loopback host port.

`VITE_API_BASE_URL` is public **build-time** configuration, passed through Compose's build arguments.
Keep its default `/api` for this stack. Rebuild the frontend after changing it; setting a runtime
environment variable on the already-built static image does not change the bundle.

### Run a package in dev (without Docker)

```bash
npm run dev --workspace packages/api
```

### Common scripts

```bash
npm run build     # build all packages
npm test          # run all tests (Vitest)
npm run lint      # lint all packages
npm run format    # format with Prettier
```

The PostgreSQL integration tests are opt-in. With a disposable PostgreSQL instance and a user that
can create test databases, run `npm run build` first, then `POSTGRES_HOST=localhost npm test` with
the matching `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` settings. The
startup regression executes the compiled ingestion entry point, creates its own temporary database,
and removes it afterwards.

## Contributing

We welcome contributions. Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the branch/PR/review workflow and **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** for community expectations. Every change goes through a pull request reviewed by at least one other maintainer.

Good places to start: issues labeled [`good first issue`](../../issues?q=label%3A%22good+first+issue%22).

## License

Licensed under the **[Apache License 2.0](LICENSE)**. The Apache-2.0 license was chosen for its explicit patent grant, which suits a platform intended to be extended with third-party plugins/connectors.
