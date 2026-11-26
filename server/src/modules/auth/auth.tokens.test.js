import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= randomBytes(48).toString("base64url");

const { createRefreshToken, hashRefreshToken, signAccessToken, verifyAccessToken } =
  await import("./auth.tokens.js");

describe("authentication token primitives", () => {
  it("creates high-entropy refresh tokens and stores only deterministic hashes", () => {
    const first = createRefreshToken();
    const second = createRefreshToken();

    assert.ok(first.length >= 60);
    assert.notEqual(first, second);
    assert.notEqual(first, hashRefreshToken(first));
    assert.equal(hashRefreshToken(first), hashRefreshToken(first));
  });

  it("signs and verifies access tokens with expected identity claims", () => {
    const token = signAccessToken({
      userId: "user-1",
      organizationId: "org-1",
      membershipId: "membership-1"
    });
    const claims = verifyAccessToken(token);

    assert.equal(claims.sub, "user-1");
    assert.equal(claims.org, "org-1");
    assert.equal(claims.mid, "membership-1");
    assert.throws(() => verifyAccessToken(`${token}tampered`));
  });
});
