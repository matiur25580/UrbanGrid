import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Asset } from "../../models/Asset.js";
import { getAssetMap, getNearbyAssets } from "./geospatial.service.js";

function mockFind(result) {
  const original = Asset.find;
  let capturedFilter;
  let capturedProjection;
  const query = {
    select(value) { capturedProjection = value; return this; },
    sort(value) { this.sortValue = value; return this; },
    limit(value) { this.limitValue = value; return this; },
    async lean() { return result; }
  };
  Asset.find = (filter) => { capturedFilter = filter; return query; };
  return {
    query,
    get filter() { return capturedFilter; },
    get projection() { return capturedProjection; },
    restore() { Asset.find = original; }
  };
}

describe("geospatial asset discovery service", () => {
  it("applies organization scope and validated polygon bounds to map discovery", async () => {
    const organizationId = "507f1f77bcf86cd799439011";
    const mock = mockFind([]);
    try {
      const result = await getAssetMap(organizationId, {
        bbox: "88.2,22.4,88.5,22.7", limit: 100,
        categoryId: "507f1f77bcf86cd799439012", criticality: "high"
      });
      assert.equal(mock.filter.organizationId, organizationId);
      assert.deepEqual(mock.filter.categoryId, "507f1f77bcf86cd799439012");
      assert.equal(mock.filter.criticality, "high");
      assert.equal(mock.filter.status.$ne, "archived");
      const polygon = mock.filter.location.$geoWithin.$geometry;
      assert.equal(polygon.type, "Polygon");
      assert.deepEqual(polygon.coordinates[0], [[88.2,22.4],[88.5,22.4],[88.5,22.7],[88.2,22.7],[88.2,22.4]]);
      assert.equal(mock.query.limitValue, 100);
      assert.equal(result.type, "FeatureCollection");
      assert.deepEqual(result.features, []);
    } finally {
      mock.restore();
    }
  });

  it("returns only approved map properties and GeoJSON geometry", async () => {
    const id = "507f1f77bcf86cd799439013";
    const mock = mockFind([{
      _id: id, assetCode: "AST-000001", name: "Pump Station",
      categoryId: "507f1f77bcf86cd799439012", status: "active",
      criticality: "high", address: "Central district", departmentId: null,
      location: { type: "Point", coordinates: [88.36, 22.57] },
      organizationId: "tenant-secret", serialNumber: "sensitive-serial"
    }]);
    try {
      const result = await getAssetMap("507f1f77bcf86cd799439011", { bbox: "88,22,89,23", limit: 10 });
      assert.equal(result.features[0].geometry.type, "Point");
      assert.equal(result.features[0].properties.assetCode, "AST-000001");
      assert.equal("organizationId" in result.features[0].properties, false);
      assert.equal("serialNumber" in result.features[0].properties, false);
    } finally {
      mock.restore();
    }
  });

  it("uses a tenant-scoped maximum-distance query for nearby discovery", async () => {
    const organizationId = "507f1f77bcf86cd799439011";
    const mock = mockFind([]);
    try {
      const result = await getNearbyAssets(organizationId, {
        longitude: 88.36, latitude: 22.57, radiusMeters: 2500, limit: 50,
        departmentId: "507f1f77bcf86cd799439014"
      });
      assert.equal(mock.filter.organizationId, organizationId);
      assert.equal(mock.filter.departmentId, "507f1f77bcf86cd799439014");
      assert.deepEqual(mock.filter.location.$near.$geometry, {
        type: "Point", coordinates: [88.36, 22.57]
      });
      assert.equal(mock.filter.location.$near.$maxDistance, 2500);
      assert.equal(mock.query.limitValue, 50);
      assert.equal(result.meta.radiusMeters, 2500);
    } finally {
      mock.restore();
    }
  });
});
