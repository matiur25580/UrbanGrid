# UrbanGrid

**Smart Infrastructure & City Operations Management Platform**

UrbanGrid is an enterprise-oriented MERN application for managing infrastructure assets, geospatial information, maintenance operations, inspections, field teams, incidents, and operational intelligence.

> Build reliable infrastructure operations through connected asset data, accountable workflows, and location-aware insight.

## Project status

**Milestone 1 — Foundation:** implemented as the initial repository baseline.

**Milestone 2 — Enterprise identity and tenant foundation:** implementation in progress on `feat/enterprise-auth-multitenancy`. The branch introduces user registration/login, bcrypt password hashing, short-lived JWT access tokens, rotating opaque refresh sessions, session revocation, organization provisioning, active membership checks, and role permission policies. See [Authentication documentation](docs/AUTHENTICATION.md).

Features are marked complete only after implementation and verification. A committed implementation is not automatically a production security certification.

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
| Identity | bcrypt, JWT, HttpOnly refresh cookie |
| Security | Helmet, CORS allowlist, rate limiting |
| Future real-time | Socket.IO |
| Future maps | Leaflet / MapLibre, GeoJSON |
| Testing | Node test runner, Supertest, Vitest, Playwright |

## Repository layout

```text
UrbanGrid/
├── client/                 # React + TypeScript application
├── server/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── models/
│       └── modules/auth/   # Identity, sessions, permissions
├── docs/                   # Architecture, security, roadmap
├── .github/workflows/      # CI automation
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
# Set a unique JWT_ACCESS_SECRET (at least 32 characters) in .env
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default and exposes:

- `GET /api/v1/health` — liveness and service metadata
- `GET /api/v1/ready` — readiness, including database connectivity
- `POST /api/v1/auth/register` — create an account and organization
- `POST /api/v1/auth/login` — sign in to an organization
- `POST /api/v1/auth/refresh` — rotate the refresh session

See [Authentication API and security behavior](docs/AUTHENTICATION.md) for the full route list and limitations.

## Environment

See [`.env.example`](.env.example). Never commit real credentials, production tokens, private keys, or database connection strings.

## Engineering documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Authentication](docs/AUTHENTICATION.md)
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
