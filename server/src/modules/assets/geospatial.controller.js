import { assetMapQuerySchema, assetNearbyQuerySchema } from "./geospatial.schemas.js";
import { getAssetMap, getNearbyAssets } from "./geospatial.service.js";

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parse(res, schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the supplied geospatial query.",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      }
    });
    return null;
  }
  return result.data;
}

export const getAssetMapFeatures = asyncHandler(async (req, res) => {
  const query = parse(res, assetMapQuerySchema, req.query);
  if (!query) return;
  const featureCollection = await getAssetMap(req.auth.organizationId, query);
  res.json({ success: true, data: featureCollection });
});

export const getNearbyAssetFeatures = asyncHandler(async (req, res) => {
  const query = parse(res, assetNearbyQuerySchema, req.query);
  if (!query) return;
  const result = await getNearbyAssets(req.auth.organizationId, query);
  res.json({ success: true, data: result });
});
