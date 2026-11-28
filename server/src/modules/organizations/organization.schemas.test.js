import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inviteSchema, acceptInvitationSchema, memberUpdateSchema, customRoleSchema, teamSchema } from "./organization.schemas.js";

describe("organization management schemas", () => {
  it("normalizes invitation emails", () => {
    assert.equal(inviteSchema.parse({ email: " OPS@EXAMPLE.COM ", role: "field_technician" }).email, "ops@example.com");
  });
  it("requires strong credentials when accepting an invitation", () => {
    assert.equal(acceptInvitationSchema.safeParse({ token: "x".repeat(48), password: "weak" }).success, false);
    assert.equal(acceptInvitationSchema.safeParse({ token: "x".repeat(48), password: "Strong-Password-2026!" }).success, true);
  });
  it("rejects invalid or empty member updates", () => {
    assert.equal(memberUpdateSchema.safeParse({}).success, false);
    assert.equal(memberUpdateSchema.safeParse({ status: "owner" }).success, false);
  });
  it("rejects permissions outside the explicit permission catalogue", () => {
    assert.equal(customRoleSchema.safeParse({ key: "regional_viewer", name: "Regional Viewer", permissions: ["system:root"] }).success, false);
  });
  it("requires organization team slugs to be URL-safe", () => {
    assert.equal(teamSchema.safeParse({ name: "Field Ops", slug: "Field Ops" }).success, false);
  });
});
