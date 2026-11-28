import { Asset } from "../../models/Asset.js";

function assetFilters(organizationId, query) {
  const filter = { organizationId, status: { $ne: "archived" } };
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.status) filter.status = query.status;
  if (query.criticality) filter.criticality = query.criticality;
  return filter;
}

function mapProperties(asset) {
  return {
    assetId: String(asset._id),
    assetCode: asset.assetCode,
    name: asset.name,
    categoryId: String(asset.categoryId),
    status: asset.status,
    criticality: asset.criticality,
    address: asset.address || "",
    departmentId: asset.departmentId ? String(asset.departmentId) : null
  };
}

export async function getAssetMap(organizationId, query) {
  const [west, south, east, north] = query.bbox.split(",").map(Number);
  const ring = [[west, south], [east, south], [east, north], [west, north], [west, south]];
  const filter = {
    ...assetFilters(organizationId, query),
    location: {
      $geoWithin: {
        $geometry: { type: "Polygon", coordinates: [ring] }
      }
    }
  };
  const assets = await Asset.find(filter)
    .select("_id assetCode name categoryId status criticality address departmentId location")
    .sort({ _id: 1 })
    .limit(query.limit)
    .lean();

  return {
    type: "FeatureCollection",
    features: assets.map((asset) => ({
      type: "Feature",
      id: String(asset._id),
      geometry: asset.location,
      properties: mapProperties(asset)
    })),
    meta: {
      returned: assets.length,
      limit: query.limit,
      bbox: [west, south, east, north],
      truncated: assets.length === query.limit
    }
  };
}

export async function getNearbyAssets(organizationId, query) {
  const assets = await Asset.find({
    ...assetFilters(organizationId, query),
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [query.longitude, query.latitude] },
        $maxDistance: query.radiusMeters
      }
    }
  })
    .select("_id assetCode name categoryId status criticality address departmentId location")
    .limit(query.limit)
    .lean();

  return {
    assets: assets.map((asset) => ({
      ...mapProperties(asset),
      location: asset.location
    })),
    meta: {
      returned: assets.length,
      limit: query.limit,
      center: { type: "Point", coordinates: [query.longitude, query.latitude] },
      radiusMeters: query.radiusMeters,
      truncated: assets.length === query.limit
    }
  };
}
