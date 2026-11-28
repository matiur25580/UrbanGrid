import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerSchema, loginSchema } from "./auth.schemas.js";

describe("authentication request validation", () => {
  it("normalizes email addresses and organization slugs", () => {
    const parsed = registerSchema.parse({
      name: "Matiur Rahaman",
      email: "MATIUR@example.com",
      password: "StrongPassword#2026",
      organizationName: "North City Works",
      organizationSlug: "North-City-Works"
    });

    assert.equal(parsed.email, "matiur@example.com");
    assert.equal(parsed.organizationSlug, "north-city-works");
  });

  it("rejects weak passwords and unsafe organization slugs", () => {
    const parsed = registerSchema.safeParse({
      name: "Matiur",
      email: "matiur@example.com",
      password: "password",
      organizationName: "North City Works",
      organizationSlug: "North City Works"
    });

    assert.equal(parsed.success, false);
  });

  it("requires an organization slug at login to resolve tenant membership", () => {
    const parsed = loginSchema.safeParse({
      email: "matiur@example.com",
      password: "StrongPassword#2026"
    });
    assert.equal(parsed.success, false);
  });
});
