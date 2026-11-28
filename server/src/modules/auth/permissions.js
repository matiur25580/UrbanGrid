export const ROLE_PERMISSIONS = Object.freeze({
  organization_owner: ["*"],
  organization_admin: ["*"],
  operations_manager: [
    "dashboard:read", "assets:read", "assets:create", "assets:update",
    "maintenance:read", "maintenance:create", "maintenance:assign", "maintenance:approve",
    "inspections:read", "inspections:create", "incidents:read", "incidents:manage",
    "workforce:read", "workforce:manage", "analytics:read", "org:members:read"
  ],
  asset_manager: ["assets:read", "assets:create", "assets:update", "assets:archive", "inspections:read", "analytics:read"],
  maintenance_supervisor: [
    "assets:read", "maintenance:read", "maintenance:create", "maintenance:assign",
    "maintenance:update", "maintenance:approve", "inspections:read", "inspections:create",
    "workforce:read", "incidents:read"
  ],
  field_technician: ["assets:read", "maintenance:read", "maintenance:update", "inspections:read", "inspections:create", "incidents:create"],
  inspector: ["assets:read", "inspections:read", "inspections:create", "inspections:approve", "incidents:create"],
  finance_manager: ["dashboard:read", "finance:read", "finance:manage", "analytics:read"],
  auditor: ["dashboard:read", "assets:read", "maintenance:read", "inspections:read", "incidents:read", "audit:read", "analytics:read", "org:members:read", "org:audit:read"],
  contractor: ["maintenance:read", "maintenance:update", "inspections:create"]
});

export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}
