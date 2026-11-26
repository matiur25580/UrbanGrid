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
});
