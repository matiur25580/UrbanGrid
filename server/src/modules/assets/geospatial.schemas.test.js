import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assetMapQuerySchema, assetNearbyQuerySchema } from "./geospatial.schemas.js";

describe("geospatial query validation", () => {
  it("accepts a valid map bounding box and applies a bounded feature limit", () => {
    const parsed = assetMapQuerySchema.parse({ bbox: "88.2,22.4,88.5,22.7", limit: "400" });
    assert.equal(parsed.limit, 400);
    assert.equal(parsed.bbox, "88.2,22.4,88.5,22.7");
  });

  it("rejects malformed, inverted, and out-of-range bounding boxes", () => {
    for (const bbox of ["88,22,abc,23", "88.5,22,88.2,23", "88,91,89,92", "88,22,181,23", "1,2,3"]) {
      assert.equal(assetMapQuerySchema.safeParse({ bbox }).success, false, bbox);
    }
  });

  it("rejects attempts to pass arbitrary MongoDB operators or tenant identifiers", () => {
    assert.equal(assetMapQuerySchema.safeParse({ bbox: "88,22,89,23", organizationId: "507f1f77bcf86cd799439011" }).success, false);
    assert.equal(assetNearbyQuerySchema.safeParse({ longitude: "88", latitude: "22", "$where": "true" }).success, false);
  });

  it("validates nearby coordinates and caps radius at 50 kilometres", () => {
    assert.equal(assetNearbyQuerySchema.safeParse({ longitude: "88.36", latitude: "22.57", radiusMeters: "5000" }).success, true);
    assert.equal(assetNearbyQuerySchema.safeParse({ longitude: "181", latitude: "22" }).success, false);
    assert.equal(assetNearbyQuerySchema.safeParse({ longitude: "88", latitude: "22", radiusMeters: "50001" }).success, false);
  });

  it("enforces bounded result counts and validates tenant-owned filter identifiers", () => {
    assert.equal(assetMapQuerySchema.safeParse({ bbox: "88,22,89,23", limit: "501" }).success, false);
    assert.equal(assetMapQuerySchema.safeParse({ bbox: "88,22,89,23", categoryId: "not-an-object-id" }).success, false);
  });
});
