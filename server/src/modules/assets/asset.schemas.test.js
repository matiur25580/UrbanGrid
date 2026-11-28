import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCategorySchema, createAssetSchema, updateAssetSchema, assetDocumentSchema, assetListQuerySchema } from "./asset.schemas.js";

const validAsset = {
  name: "North Pump Station",
  categoryId: "507f1f77bcf86cd799439011",
  location: { type: "Point", coordinates: [88.3639, 22.5726] }
};

describe("asset registry validation", () => {
  it("accepts a valid geospatial asset and normalizes its point type", () => {
    const parsed = createAssetSchema.parse(validAsset);
    assert.equal(parsed.location.type, "Point");
    assert.deepEqual(parsed.location.coordinates, [88.3639, 22.5726]);
  });

  it("rejects invalid coordinates and warranty dates before acquisition", () => {
    assert.equal(createAssetSchema.safeParse({ ...validAsset, location: { coordinates: [220, 91] } }).success, false);
    assert.equal(createAssetSchema.safeParse({ ...validAsset, acquisitionDate: "2026-10-10", warrantyExpiryDate: "2026-01-01" }).success, false);
  });

  it("requires unique configurable metadata keys and select options", () => {
    assert.equal(createCategorySchema.safeParse({ key: "pump", name: "Pump", metadataFields: [{ key: "capacity", label: "Capacity", type: "number" }, { key: "capacity", label: "Capacity 2", type: "number" }] }).success, false);
    assert.equal(createCategorySchema.safeParse({ key: "pump", name: "Pump", metadataFields: [{ key: "type", label: "Type", type: "select" }] }).success, false);
  });

  it("allows only safe document metadata and bounded file sizes", () => {
    assert.equal(assetDocumentSchema.safeParse({ filename: "manual.pdf", mimeType: "application/pdf", sizeBytes: 5000 }).success, true);
    assert.equal(assetDocumentSchema.safeParse({ filename: "script.js", mimeType: "text/javascript", sizeBytes: 100 }).success, false);
    assert.equal(assetDocumentSchema.safeParse({ filename: "large.pdf", mimeType: "application/pdf", sizeBytes: 999999999 }).success, false);
  });

  it("bounds pagination and whitelists sort fields", () => {
    assert.equal(assetListQuerySchema.safeParse({ page: "1", limit: "25", sortBy: "name" }).success, true);
    assert.equal(assetListQuerySchema.safeParse({ limit: "10000", sortBy: "passwordHash" }).success, false);
  });

  it("rejects empty asset updates", () => {
    assert.equal(updateAssetSchema.safeParse({}).success, false);
  });
});
