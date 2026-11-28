import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { Asset } from "./Asset.js";
import { AssetCategory } from "./AssetCategory.js";

describe("asset persistence model", () => {
  it("enforces tenant-scoped asset identifiers and geospatial indexes", () => {
    const indexes = Asset.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.organizationId === 1 && keys.assetCode === 1 && options.unique === true));
    assert.ok(indexes.some(([keys]) => keys.location === "2dsphere"));
  });

  it("rejects invalid GeoJSON coordinates at the model boundary", async () => {
    const id = new mongoose.Types.ObjectId();
    const asset = new Asset({
      organizationId: id, assetCode: "AST-000001", name: "Pump Station",
      categoryId: id, createdBy: id, updatedBy: id,
      location: { type: "Point", coordinates: [200, 95] }
    });
    await assert.rejects(asset.validate());
  });

  it("enforces tenant-scoped category keys", () => {
    const indexes = AssetCategory.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.organizationId === 1 && keys.key === 1 && options.unique === true));
  });
});
