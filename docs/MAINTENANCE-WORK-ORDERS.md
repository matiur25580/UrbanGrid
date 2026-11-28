# Maintenance work orders

The work-order API is mounted at `/api/v1/work-orders`. Every route requires authentication and derives organization scope from the verified membership context. A caller cannot choose an organization in the body or query string.

## Endpoints

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/` | `maintenance:read` | Filtered, sorted, paginated work-order queue |
| POST | `/` | `maintenance:create` | Create a preventive, corrective, emergency, or inspection work order |
| GET | `/:workOrderId` | `maintenance:read` | Read a work order and its asset/assignee summary |
| PATCH | `/:workOrderId/assignee` | `maintenance:assign` | Assign an active organization member |
| PATCH | `/:workOrderId/status` | `maintenance:update` | Move a work order through an allowed lifecycle transition |
| PATCH | `/:workOrderId/checklist/:itemId` | `maintenance:update` | Complete/reopen a checklist item and record a note |
| POST | `/:workOrderId/review` | `maintenance:approve` | Approve or reject a completion request |

## Lifecycle and controls

- New work orders receive organization-scoped identifiers such as `WO-000001`, allocated by an atomic counter.
- A future scheduled date creates a planned work order; otherwise it opens immediately. Creating with an assignee creates it in assigned state.
- Only assets in the authenticated organization that are not archived, retired, or decommissioned can receive work orders.
- Assignees must be active memberships in the same organization.
- A technician cannot start work until assigned.
- Checklist items can be completed/reopened only while assigned or in progress; updates are audited. Required checklist items must be completed before requesting completion approval.
- Completion requires a resolution summary and enters `pending_approval`.
- The requester cannot approve their own work order. A reviewer with `maintenance:approve` must approve or reject it. Rejection returns the work order to `in_progress`.
- Completed and cancelled work orders are terminal. All state changes and key actions emit tenant-scoped audit events.

Allowed transitions:

```text
planned -> open | cancelled
open -> assigned | cancelled
assigned -> open | in_progress | cancelled
in_progress -> pending_approval | cancelled
pending_approval -> completed | in_progress
completed -> (terminal)
cancelled -> (terminal)
```

Assignment is performed only through the dedicated assignee endpoint, which validates the target membership.

## Query parameters

- `page`, `limit` (1–100)
- `search` (work-order code/title)
- `status`, `priority`, `type`
- `assetId`, `assignedMembershipId`, `dueBefore`
- `sortBy`: `createdAt`, `updatedAt`, `dueAt`, `scheduledFor`, or `priority`
- `sortOrder`: `asc` or `desc`

## Scope and production boundaries

This milestone provides a workflow API and persistence model, not a background scheduler, notification delivery service, vendor dispatch integration, inventory/parts ledger, or offline field application. Due dates are queryable but are not automatically monitored. Audit writes are not transactionally coupled to work-order writes; production hardening should add transaction/outbox handling, database-backed cross-tenant integration tests, idempotent command handling, and operational alerting.
