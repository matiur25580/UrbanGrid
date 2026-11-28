# Infrastructure asset registry

The asset API is mounted at `/api/v1/assets`. Every route requires a bearer access token. Organization scope is taken exclusively from the authenticated membership context; request bodies and query strings cannot select a tenant.

## Asset categories

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/categories` | `assets:read` | List active categories and their metadata definitions |
| POST | `/categories` | `assets:categories:manage` | Create an organization-scoped category |

Categories define a key, display name, description, and up to 30 metadata fields. Field types are `text`, `number`, `boolean`, `date`, and `select`. Select fields require a bounded options list. Keys must be unique within a category and metadata values are checked against the active category definition on create and update.

## Asset lifecycle and records

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/` | `assets:read` | Search, filter, sort, and paginate assets |
| POST | `/` | `assets:create` | Create an asset |
| GET | `/:assetId` | `assets:read` | Retrieve an asset |
| PATCH | `/:assetId` | `assets:update` | Update asset details or lifecycle state |
| DELETE | `/:assetId` | `assets:archive` | Soft archive an asset |
| GET | `/:assetId/documents` | `assets:read` | List evidence/document metadata |
| POST | `/:assetId/documents` | `assets:documents:manage` | Register expected document metadata |

Asset records include a tenant-scoped human-readable code, category, serial/model/manufacturer details, acquisition and warranty dates, criticality, lifecycle status, assigned membership, department/team, address, GeoJSON Point, configurable metadata, document metadata, and maintenance-history references.

When no code is supplied, the API atomically increments an organization-scoped counter and creates identifiers such as `AST-000001`. The database also enforces a unique compound index on `organizationId + assetCode`.

Lifecycle transitions are constrained: active assets may enter maintenance, be decommissioned, or retired; assets under maintenance may return to active or move to decommissioned/retired; decommissioned assets may only be retired. Retired assets cannot be reactivated through this API. DELETE is a soft archive and does not physically remove the record.

## List query parameters

- `page`: 1-based page number (default 1)
- `limit`: 1–100 (default 25)
- `search`: bounded search over name, asset code, serial number, and manufacturer
- `categoryId`, `status`, `criticality`, `departmentId`: optional filters
- `sortBy`: `createdAt`, `updatedAt`, `name`, `assetCode`, `criticality`, or `acquisitionDate`
- `sortOrder`: `asc` or `desc`

## Tenant and integrity controls

- All asset/category queries include the authenticated `organizationId`.
- Category, assignee, department, and team references are checked against the same organization before writes.
- Team/department consistency is verified when both are assigned.
- Search input is bounded and stripped to a safe literal character set before regex use; sort fields are allowlisted.
- GeoJSON coordinates use `[longitude, latitude]` ordering and are indexed with a 2dsphere index.
- Audit events are recorded for category creation, asset creation/update, lifecycle changes, archiving, and document metadata registration.
- Asset identifiers and category keys have tenant-scoped unique indexes.

## Document storage boundary

The document endpoint records metadata only and returns HTTP 202 with `upload: not_configured`. It accepts a small MIME allowlist and a maximum declared size of 25 MiB. It does **not** upload, scan, store, or serve binary files; no object-storage provider, signed URL, malware scanning, or download endpoint is configured. A future storage adapter must verify the actual bytes, enforce size/type limits independently of client metadata, scan/quarantine content, and issue short-lived tenant-authorized download links.

## Maintenance integration

The asset schema reserves references for future work orders and stores bounded maintenance-history snapshots. No work-order model or maintenance workflow is implemented in this milestone; those references are placeholders, not evidence of an integrated maintenance module.

## Known limitations

- No MongoDB-backed tenant-boundary integration suite is configured in CI. Current coverage includes schema validation, Mongoose model/index checks, and API authentication guards; these do not replace cross-tenant integration tests against a real database.
- Asset category updates/archival, bulk import/export, QR/barcode generation, physical file upload, geospatial radius queries, work-order integration, and ownership transfer are future work.
- Audit writes are awaited after mutations but are not transactionally coupled through an outbox.
- This milestone has not received an independent security audit or production certification.
