import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, ROLE_PERMISSIONS } from "./permissions.js";

describe("organization role permissions", () => {
  it("grants owners and administrators the organization permission wildcard", () => {
    assert.equal(hasPermission("organization_owner", "organization:manage"), true);
    assert.equal(hasPermission("organization_admin", "finance:manage"), true);
  });

  it("limits field technicians to operational permissions", () => {
    assert.equal(hasPermission("field_technician", "maintenance:update"), true);
    assert.equal(hasPermission("field_technician", "finance:manage"), false);
    assert.equal(hasPermission("field_technician", "organization:manage"), false);
  });

  it("grants asset registry capabilities to the asset manager", () => {
    assert.equal(hasPermission("asset_manager", "assets:create"), true);
    assert.equal(hasPermission("asset_manager", "assets:archive"), true);
    assert.equal(hasPermission("asset_manager", "assets:categories:manage"), true);
    assert.equal(hasPermission("asset_manager", "assets:documents:manage"), true);
    assert.equal(hasPermission("asset_manager", "finance:manage"), false);
  });

  it("does not grant permissions to unknown roles", () => {
    assert.equal(hasPermission("unknown_role", "assets:read"), false);
    assert.deepEqual(ROLE_PERMISSIONS.unknown_role || [], []);
  });
});
