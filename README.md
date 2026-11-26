# UrbanGrid

**Smart Infrastructure & City Operations Management Platform**

UrbanGrid is an enterprise-oriented MERN application for managing infrastructure assets, geospatial information, maintenance operations, inspections, field teams, incidents, and operational intelligence.

> Build reliable infrastructure operations through connected asset data, accountable workflows, and location-aware insight.

## Project status

**Milestone 1 — Foundation:** in progress.

This repository is being developed incrementally. Features will be marked complete only after implementation and verification. The initial release establishes the application workspace, API health endpoint, configuration validation, and contributor conventions.

## Product principles

- **Tenant isolation first:** organization-owned data must always be scoped to the authenticated tenant.
- **Secure by default:** validate input, keep secrets out of source control, use least-privilege authorization, and avoid leaking internal errors.
- **Operational traceability:** important state changes should be attributable and auditable.
- **Modular, not prematurely distributed:** begin with a modular monolith and extract services only when justified.
- **Honest intelligence:** simulated telemetry and heuristic risk scores must be clearly labeled; they are not engineering certifications or failure guarantees.

## Planned capabilities

1. Enterprise identity, organizations, membership, and granular RBAC
2. Infrastructure asset registry and lifecycle records
3. GIS-based asset discovery and geographic layers
4. Work orders, preventive maintenance, and approvals
5. Inspections, defects, and field workforce workflows
6. Contractor and service-level management
7. Simulated IoT telemetry, alerting, and incident response
8. Asset health indicators and maintenance prioritization
9. Budgets, operational analytics, and executive reporting
10. Audit trails, observability, testing, and deployment automation

## Technology

| Layer | Technology |
| --- | --- |
| Web | React, TypeScript, Vite |
| API | Node.js, Express |
| Database | MongoDB, Mongoose |
| Validation | Zod |
| Security | Helmet, CORS allowlist, rate limiting |
| Future real-time | Socket.IO |
| Future maps | Leaflet / MapLibre, GeoJSON |
| Testing | Node test runner, Supertest, Vitest, Playwright |

## Repository layout

```text
UrbanGrid/
├── client/                 # React + TypeScript application
├── server/                 # Express API
├── docs/                   # Architecture and engineering decisions
├── .github/workflows/      # CI automation
├── .env.example
├── .gitignore
├── package.json            # npm workspaces
└── README.md
```

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- MongoDB 7+ (local instance or managed cluster)

## Getting started

```bash
git clone https://github.com/matiur25580/UrbanGrid.git
cd UrbanGrid
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default and exposes:

- `GET /api/v1/health` — liveness and service metadata
- `GET /api/v1/ready` — readiness, including database connectivity

The web application runs on `http://localhost:5173`.

## Environment

See [`.env.example`](.env.example). Never commit real credentials, production tokens, private keys, or database connection strings.

## Engineering documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development roadmap](docs/ROADMAP.md)
- [Security baseline](docs/SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## Development commands

```bash
npm run dev
npm run build
npm run lint
npm run test
```

## License

This project is currently marked as **All rights reserved** pending an explicit license decision. Do not assume permission to redistribute or reuse the source.
