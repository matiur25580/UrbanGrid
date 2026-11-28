# Organization and workforce management

All endpoints are mounted under `/api/v1/organizations` and require a bearer access token. Tenant scope is derived from `req.auth.organizationId`; callers cannot choose another tenant by passing an organization ID to member, role, department, team, or audit queries.

## Endpoints

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/mine` | Authenticated | List the user's active organizations |
| POST | `/switch` | Authenticated | Issue a new organization-bound access/refresh session |
| GET | `/members` | `org:members:read` | Organization membership directory |
| POST | `/invitations` | `org:invitations:manage` | Create a seven-day, single-use invitation |
| POST | `/invitations/accept` | Public; rate-limited | Accept an invitation and create/sign in to the invited account |
| PATCH | `/members/:membershipId` | `org:members:manage` | Change role, status, department, or team membership |
| GET | `/roles` | `org:members:read` | List built-in and custom roles |
| POST | `/roles` | `org:roles:manage` | Create an organization-scoped custom role |
| PATCH | `/roles/:roleId` | `org:roles:manage` | Update or archive a custom role |
| GET | `/permissions` | Authenticated | Resolve current role permissions |
| GET/POST | `/departments` | Read/manage permission | List or create departments |
| GET/POST | `/teams` | Read/manage permission | List or create teams |
| PATCH | `/teams/:teamId` | `org:teams:manage` | Update team metadata and membership |
| GET | `/audit` | `org:audit:read` | Paginated organization audit events |

## Invitation lifecycle

An authorized administrator creates an invitation for an email and built-in/custom role. The API returns a high-entropy token once; only its SHA-256 hash is stored. The administrator must deliver the token through an approved channel because automated email delivery is not configured. The invitee submits the token, a strong password, and (for a new account) their name. Existing accounts must verify their password; new users are provisioned with the invitation's email. The API validates expiry, revocation, email ownership, and role availability before activating membership, then issues an organization-bound access token and refresh cookie. The endpoint is public because a new invitee cannot yet authenticate as a member of the target organization; it is protected by a dedicated rate limiter.

Invitation tokens expire after seven days and are single-use. Creating a replacement revokes prior pending invitations for the same organization/email pair.

## Tenant and authorization safeguards

- Every organization-owned query filters by the authenticated organization ID.
- Related department, team, role, and membership IDs are checked against the same organization before assignment.
- Custom role keys are unique within an organization; permissions are selected from a server-side allowlist.
- Authorization resolves custom role permissions from the database on each protected request.
- The organization owner cannot be demoted through the ordinary member-update endpoint; ownership transfer is a separate future workflow.
- Audit events record actor, action, entity, target, timestamp, IP, user agent, and non-secret metadata.

## Known limitations

- Invitation delivery is manual; no SMTP/provider integration is configured.
- Department editing/archival and team archival are future enhancements.
- No ownership transfer, SCIM, SSO, MFA, approval workflow, or organization deletion lifecycle is included.
- Audit writes are awaited after mutations, but there is no MongoDB transaction/outbox yet; a database failure between mutation and audit write can leave an incomplete audit trail.
- Full MongoDB-backed cross-tenant integration tests require a configured replica-set-capable test database and are not represented by schema tests alone.
