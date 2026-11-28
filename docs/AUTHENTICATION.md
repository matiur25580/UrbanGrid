# Identity, sessions, organizations, and authorization

## Implemented API

Base path: `/api/v1/auth`

| Method | Endpoint | Purpose | Authentication |
| --- | --- | --- | --- |
| POST | `/register` | Create a user, organization, owner membership, and session | Public; rate-limited |
| POST | `/login` | Authenticate against an organization slug | Public; rate-limited |
| POST | `/refresh` | Rotate the refresh session and issue a new access token | Refresh cookie |
| POST | `/logout` | Revoke the presented refresh session | Refresh cookie |
| POST | `/logout-all` | Revoke all active refresh sessions for the user | Bearer access token |
| GET | `/me` | Return current user/organization membership context | Bearer access token |
| GET | `/sessions` | List active refresh sessions for the user | Bearer access token |
| DELETE | `/sessions/:sessionId` | Revoke one of the user's refresh sessions | Bearer access token |
| GET | `/permissions` | Return the current role's permission set | Bearer access token |

### Registration example

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "Use-A-Strong-Password-2026!",
  "organizationName": "North City Works",
  "organizationSlug": "north-city-works"
}
```

A successful response returns an access token in JSON and sets the refresh token in an HttpOnly cookie. The refresh token is never returned in JSON.

### Login example

```json
{
  "email": "alex@example.com",
  "password": "Use-A-Strong-Password-2026!",
  "organizationSlug": "north-city-works"
}
```

The organization slug is required for organization-scoped login. Registration provisions the first organization owner; additional memberships are created through the invitation workflow, and authenticated users can switch active organization context. See [Organization management](ORGANIZATION-MANAGEMENT.md) for invitation acceptance and organization switching.

## Security behavior

- Passwords are hashed using bcrypt with a work factor of 12.
- Access tokens are HS256 JWTs with issuer, audience, and a short configurable lifetime (15 minutes by default).
- Refresh tokens are cryptographically random opaque values. Only SHA-256 hashes are persisted.
- Refresh sessions rotate on use. Reuse of a previously rotated refresh token revokes the user's active refresh sessions.
- Refresh cookies are HttpOnly, SameSite=Strict, scoped to the auth API path, and Secure in production.
- Session expiry is 30 days; expired records are eligible for MongoDB TTL cleanup.
- Authentication resolves the current active membership and organization from MongoDB on every protected request. Role changes and membership suspension therefore take effect without waiting for an access token to expire.
- RBAC is enforced on the API, never trusted from frontend state.
- Registration/login and refresh endpoints have an additional rate limiter.

## Tenant isolation contract

The organization identifier is read from signed access-token claims and checked against the active membership in the database. Future tenant-owned modules must use `req.auth.organizationId` as the source of tenant scope. Never accept a tenant identifier from a body/query parameter as authorization.

## Current limitations and deployment notes

- Registration creates user, organization, and owner membership with compensating cleanup on failure. A MongoDB replica-set transaction should replace this when the deployment baseline guarantees transaction support.
- Email verification, password reset, MFA, SSO, account recovery, and organization ownership transfer are not implemented yet. Organization invitations and organization switching are available as described in [Organization management](ORGANIZATION-MANAGEMENT.md).
- Revoking a refresh session prevents future refreshes. Already issued access tokens remain valid until their short expiry (15 minutes by default).
- The refresh cookie uses SameSite=Strict. If the frontend is later hosted on a different site, revisit the cookie and CSRF strategy before changing this policy.
- Use a unique high-entropy JWT secret in each environment and terminate TLS at the production edge.
