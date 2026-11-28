import { createCategorySchema, createAssetSchema, updateAssetSchema, assetDocumentSchema, assetListQuerySchema, assetIdSchema } from "./asset.schemas.js";
import {
  listAssetCategories, createAssetCategory, createAsset, listAssets, getAsset,
  updateAsset, archiveAsset, addAssetDocument, listAssetDocuments
} from "./asset.service.js";

function parse(res, schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the supplied information.",
        details: result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
      }
    });
    return null;
  }
  return result.data;
}
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export const getCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { categories: await listAssetCategories(req.auth.organizationId) } });
});
export const postCategory = asyncHandler(async (req, res) => {
  const body = parse(res, createCategorySchema, req.body);
  if (!body) return;
  res.status(201).json({ success: true, data: { category: await createAssetCategory(req, body) } });
});
export const getAssets = asyncHandler(async (req, res) => {
  const query = parse(res, assetListQuerySchema, req.query);
  if (!query) return;
  res.json({ success: true, data: await listAssets(req.auth.organizationId, query) });
});
export const postAsset = asyncHandler(async (req, res) => {
  const body = parse(res, createAssetSchema, req.body);
  if (!body) return;
  res.status(201).json({ success: true, data: { asset: await createAsset(req, body) } });
});
export const getAssetById = asyncHandler(async (req, res) => {
  const assetId = parse(res, assetIdSchema, req.params.assetId);
  if (!assetId) return;
  res.json({ success: true, data: { asset: await getAsset(req.auth.organizationId, assetId) } });
});
export const patchAsset = asyncHandler(async (req, res) => {
  const assetId = parse(res, assetIdSchema, req.params.assetId);
  const body = parse(res, updateAssetSchema, req.body);
  if (!assetId || !body) return;
  res.json({ success: true, data: { asset: await updateAsset(req, assetId, body) } });
});
export const deleteAsset = asyncHandler(async (req, res) => {
  const assetId = parse(res, assetIdSchema, req.params.assetId);
  if (!assetId) return;
  res.json({ success: true, data: { asset: await archiveAsset(req, assetId) } });
});
export const postAssetDocument = asyncHandler(async (req, res) => {
  const assetId = parse(res, assetIdSchema, req.params.assetId);
  const body = parse(res, assetDocumentSchema, req.body);
  if (!assetId || !body) return;
  res.status(202).json({
    success: true,
    data: { document: await addAssetDocument(req, assetId, body) },
    meta: { upload: "not_configured", message: "Document metadata is recorded; binary upload requires a configured storage provider." }
  });
});
export const getAssetDocuments = asyncHandler(async (req, res) => {
  const assetId = parse(res, assetIdSchema, req.params.assetId);
  if (!assetId) return;
  res.json({ success: true, data: { documents: await listAssetDocuments(req.auth.organizationId, assetId) } });
});
