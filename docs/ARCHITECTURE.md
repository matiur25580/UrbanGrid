# Architecture

## Initial approach

UrbanGrid starts as a **modular monolith**: one React client and one Express API, organized around business capabilities. This keeps local development and deployment approachable while preserving clear module boundaries.

## Runtime boundaries

- The client communicates with the API over versioned JSON REST endpoints.
- The API owns validation, authentication, authorization, business rules, and persistence.
- MongoDB is the system of record.
- Background jobs and Socket.IO are introduced when the first workflows require them; they are not simulated as production infrastructure in the foundation.

## Backend module convention

Each future domain module should own its routes, controller, service, model, validation schemas, and tests where appropriate. Controllers translate HTTP requests; services enforce business rules; models define persistence. Cross-domain access should go through explicit service interfaces rather than importing another module's internals.

## Tenant isolation

Every tenant-owned record must include an organization identifier. Tenant scope must be derived from the authenticated membership context, never trusted from an arbitrary request body or query parameter. Database queries, unique indexes, file access, background jobs, and socket subscriptions must all preserve the same boundary.

## API conventions

- Prefix: `/api/v1`
- JSON response envelope: `{ success, data }` or `{ success: false, error }`
- Use stable machine-readable error codes.
- Validate request bodies, params, and query strings at the boundary.
- Paginate collection endpoints.
- Keep liveness and readiness endpoints distinct.

## Data design principles

Prefer explicit references for independently managed entities such as organizations, users, assets, work orders, and contractors. Embed bounded snapshots when historical context must remain stable (for example, an asset label captured on a completed work order). Add indexes based on measured query patterns, including compound tenant-scoped indexes and GeoJSON 2dsphere indexes for spatial queries.

## Reliability

- Graceful shutdown for HTTP and database connections.
- Bounded request payloads and rate limits.
- Structured logging and request correlation are planned before production rollout.
- Readiness must fail when required dependencies are unavailable.
