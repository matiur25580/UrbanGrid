# Security baseline

This document records the implemented controls and remaining security work. It is not a claim that the application has completed an independent security audit.

## Implemented identity controls

- Password hashes use bcrypt with a work factor of 12; hashes are excluded from normal Mongoose query projections.
- Access tokens are short-lived HS256 JWTs with issuer and audience validation.
- Refresh credentials are random opaque tokens; only SHA-256 hashes are persisted.
- Refresh tokens rotate after use. Reuse of a revoked token triggers revocation of the user's remaining active refresh sessions.
- Refresh cookies are HttpOnly, SameSite=Strict, scoped to the authentication API, and Secure in production.
- Protected requests resolve active membership and organization records from MongoDB. Role and membership changes are therefore checked server-side on each request.
- Registration and login use Zod validation, generic invalid-credential responses, and dedicated rate limiting.
- Session listing, single-session revocation, and sign-out-all are available.

## Required controls before production

- Keep secrets in a managed secret store and rotate credentials regularly.
- Add email verification, password reset, account recovery, MFA, and organization invitations.
- Replace registration's compensating cleanup with MongoDB transactions once replica-set support is guaranteed.
- Add centralized audit events for identity, membership, and future business-critical mutations.
- Add CSRF protection appropriate to the final deployment topology before changing the SameSite cookie policy.
- Add dependency scanning, secret scanning, security headers review, and automated penetration testing.
- Define backup/restore, incident response, and key-rotation runbooks.
- Review access-token revocation requirements; refresh-session revocation does not invalidate already-issued access tokens before their short expiry.

## Tenant isolation contract

Every tenant-owned record must include an organization identifier. Tenant scope must be derived from the authenticated membership context, never trusted from an arbitrary request body or query parameter. Database queries, unique indexes, file access, background jobs, and socket subscriptions must all preserve the same boundary.

For each tenant-owned resource, tests must prove that a user from organization A cannot read, update, delete, export, or infer records belonging to organization B, including through nested resources, search, aggregate reports, file URLs, and real-time subscriptions.

## Incident response

Document how to rotate compromised secrets, revoke sessions, restore database backups, and review audit events before production use.
