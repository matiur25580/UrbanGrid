import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getCategories, postCategory, getAssets, postAsset, getAssetById,
  patchAsset, deleteAsset, postAssetDocument, getAssetDocuments
} from "./asset.controller.js";

const router = Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use(authenticate);

router.get("/categories", authorize("assets:read"), getCategories);
router.post("/categories", authorize("assets:categories:manage"), postCategory);
router.get("/", authorize("assets:read"), getAssets);
router.post("/", authorize("assets:create"), postAsset);
router.get("/:assetId", authorize("assets:read"), getAssetById);
router.patch("/:assetId", authorize("assets:update"), patchAsset);
router.delete("/:assetId", authorize("assets:archive"), deleteAsset);
router.get("/:assetId/documents", authorize("assets:read"), getAssetDocuments);
router.post("/:assetId/documents", authorize("assets:documents:manage"), postAssetDocument);

export default router;
