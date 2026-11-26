# Authentication module

This module owns identity registration/login, refresh-session lifecycle, organization membership resolution, and role permission checks.

- `auth.schemas.js`: Zod request contracts.
- `auth.service.js`: business logic and persistence.
- `auth.controller.js`: HTTP response mapping.
- `auth.routes.js`: versioned route definitions and rate limits.
- `auth.tokens.js`: JWT and opaque refresh-token primitives.
- `permissions.js`: centralized role-to-permission map.

Protected controllers receive a trusted `req.auth` context from `authenticate`. Tenant-aware data modules must scope every read and write using `req.auth.organizationId`.
