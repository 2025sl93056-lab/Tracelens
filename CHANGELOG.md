# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo scaffolding (npm workspaces, TypeScript, Vitest, ESLint, Prettier).
- Shared contracts package (`@tracelens/shared`) with telemetry, incident, graph, and API types.
- Service graph derivation from trace spans (`deriveGraphFromSpans`, parent span → child span = `CALLS`).
- Core REST API (`@tracelens/api`): `GET /graph`, `GET /graph/impact`, `GET /incidents`, `GET /incidents/:id`, `GET /services`, plus `GET /health`.
- JWT login (`POST /auth/login`) with auth middleware and viewer/admin RBAC.
- PostgreSQL data layer: connection helper and idempotent schema migration (services, edges, telemetry, incidents).
- API reference documentation (`docs/API.md`).
- CI pipeline (lint, typecheck, test, build) via GitHub Actions.
- Docker Compose for a one-command full-stack run.
- Open-source project files: Apache-2.0 license, README, CONTRIBUTING, Code of Conduct, issue/PR templates.
- **ingestion**: HTTP API (`POST /telemetry`, `POST /telemetry/batch`, `GET /health`) with API-key auth, validation, and PostgreSQL persistence (resolves #1).
- **ingestion**: Dockerfile for containerised deployment; ingestion service wired into `docker-compose.yml`.

[Unreleased]: https://github.com/OWNER/tracelens/commits/main
