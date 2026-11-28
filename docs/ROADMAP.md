# Development roadmap

| Milestone | Scope | Exit criteria |
| --- | --- | --- |
| 1. Foundation | MERN workspace, configuration, API health, docs, CI baseline | Client builds; API starts; health and readiness are testable |
| 2. Identity | Registration, bcrypt password hashing, access/refresh tokens, session rotation and revocation | Auth tests pass; secure cookie policy and session lifecycle documented |
| 3. Organizations & RBAC | Invitations, membership administration, organization switching, custom roles, departments, teams, audit events | Tenant-scoped APIs, permission checks, schema tests, and cross-tenant test coverage |
| 4. Asset registry | Asset categories, identifiers, lifecycle, documents | Tenant-scoped CRUD and validation |
| 5. Geospatial | GeoJSON locations, map layers, spatial filters | Geospatial index and map workflows verified |
| 6. Maintenance | Work orders, schedules, assignment, approvals | Full work-order lifecycle tests |
| 7. Inspections & field teams | Checklists, evidence, technician workflows | Mobile-responsive field workflow |
| 8. Monitoring & incidents | Simulated telemetry, thresholds, event processing, alerts | Reproducible scenarios and event tests |
| 9. Intelligence & finance | Explainable health scores, prioritization, budget analytics | Documented formulas and deterministic fixtures |
| 10. Production readiness | Security review, observability, CI/CD, Docker, backups | Deployment runbook and automated quality gates |

A milestone is not complete because its UI exists. Completion requires working end-to-end behavior, tests, documentation, and an explicit limitations section.
