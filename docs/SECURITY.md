# Security baseline

This document records the initial security expectations. It is not a claim that the application has completed a security audit.

## Required controls

- Keep secrets in environment variables or a managed secret store; commit only placeholders.
- Hash passwords with a deliberately slow password-hashing algorithm when identity is implemented.
- Use short-lived access tokens and rotating, revocable refresh sessions.
- Store browser refresh credentials in Secure, HttpOnly, SameSite cookies in production.
- Enforce organization scope and granular permissions on the server for every protected operation.
- Validate and normalize all untrusted input.
- Use an explicit CORS origin allowlist, Helmet, bounded request bodies, and rate limits.
- Avoid returning stack traces, secrets, or internal database errors to clients.
- Audit security-sensitive and business-critical mutations.
- Protect uploads with type/size validation, private storage, and authorization checks.
- Add dependency scanning and automated tests to CI.

## Tenant isolation test cases

For each tenant-owned resource, tests must prove that a user from organization A cannot read, update, delete, export, or infer records belonging to organization B, including through nested resources, search, aggregate reports, file URLs, and real-time subscriptions.

## Incident response

Document how to rotate compromised secrets, revoke sessions, restore database backups, and review audit events before production use.
