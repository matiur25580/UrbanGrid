import mongoose from "mongoose";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Asset } from "../../models/Asset.js";
import { getAssetMap, getNearbyAssets } from "./geospatial.service.js";

const mongoUri = process.env.MONGODB_TEST_URI;
const enabled = Boolean(mongoUri);
const organizationA = new mongoose.Types.ObjectId();
const organizationB = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId();
const actorId = new mongoose.Types.ObjectId();

describe("geospatial MongoDB integration", { skip: !enabled }, () => {
  before(async () => {
    await mongoose.connect(mongoUri);
    await Asset.syncIndexes();
  });

  beforeEach(async () => {
    await Asset.deleteMany({ organizationId: { $in: [organizationA, organizationB] } });
  });

  after(async () => {
    await Asset.deleteMany({ organizationId: { $in: [organizationA, organizationB] } });
    await mongoose.disconnect();
  });

  async function seedAsset(organizationId, assetCode, longitude, latitude) {
    return Asset.create({
      organizationId,
      assetCode,
      name: `Integration asset ${assetCode}`,
      categoryId,
      criticality: "high",
      status: "active",
      location: { type: "Point", coordinates: [longitude, latitude] },
      createdBy: actorId,
      updatedBy: actorId
    });
  }

  it("isolates bounding-box results by organization in MongoDB", async () => {
    const own = await seedAsset(organizationA, `A-${new mongoose.Types.ObjectId()}`, 88.36, 22.57);
    await seedAsset(organizationB, `B-${new mongoose.Types.ObjectId()}`, 88.37, 22.58);

    const result = await getAssetMap(String(organizationA), {
      bbox: "88.2,22.4,88.5,22.8",
      limit: 100
    });

    assert.deepEqual(result.features.map((feature) => feature.id), [String(own._id)]);
    assert.equal(result.features[0].properties.assetCode, own.assetCode);
  });

  it("isolates nearby results and applies the MongoDB distance boundary", async () => {
    const own = await seedAsset(organizationA, `A-${new mongoose.Types.ObjectId()}`, 88.36, 22.57);
    await seedAsset(organizationB, `B-${new mongoose.Types.ObjectId()}`, 88.3605, 22.57);
    await seedAsset(organizationA, `A-FAR-${new mongoose.Types.ObjectId()}`, 89.1, 23.1);

    const result = await getNearbyAssets(String(organizationA), {
      longitude: 88.36,
      latitude: 22.57,
      radiusMeters: 500,
      limit: 100
    });

    assert.deepEqual(result.assets.map((asset) => asset.assetCode), [own.assetCode]);
    assert.equal(result.meta.radiusMeters, 500);
  });
});
