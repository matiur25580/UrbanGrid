import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-only-secret-that-is-long-enough-123456";

const { createApp } = await import("./app.js");

describe("UrbanGrid API foundation", () => {
  it("exposes a liveness endpoint", async () => {
    const response = await request(createApp()).get("/api/v1/health");
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.service, "urbangrid-api");
  });

  it("reports ready when required dependencies are connected", async () => {
    const response = await request(createApp({ databaseStatus: () => "connected" }))
      .get("/api/v1/ready");
    assert.equal(response.status, 200);
    assert.equal(response.body.data.database, "connected");
  });

  it("reports not ready when the database is unavailable", async () => {
    const response = await request(createApp()).get("/api/v1/ready");
    assert.equal(response.status, 503);
    assert.equal(response.body.success, false);
  });

  it("returns a stable JSON error for unknown routes", async () => {
    const response = await request(createApp()).get("/api/v1/missing");
    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, "ROUTE_NOT_FOUND");
  });

  it("validates registration input before attempting database writes", async () => {
    const response = await request(createApp())
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "weak" });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(response.headers["cache-control"], "no-store");
  });

  it("requires a bearer token for protected identity routes", async () => {
    const response = await request(createApp()).get("/api/v1/auth/me");
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
  });

  it("requires a bearer token for asset registry routes", async () => {
    const response = await request(createApp()).get("/api/v1/assets");
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
    assert.equal(response.headers["cache-control"], "no-store");
  });

  it("requires a bearer token for organization administration routes", async () => {
    const response = await request(createApp()).get("/api/v1/organizations/members");
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
  });
});
