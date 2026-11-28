import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { list, create, getById, assign, transition, review, updateChecklistItem } from "./work-order.controller.js";

const router = Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use(authenticate);
router.get("/", authorize("maintenance:read"), list);
router.post("/", authorize("maintenance:create"), create);
router.get("/:workOrderId", authorize("maintenance:read"), getById);
router.patch("/:workOrderId/assignee", authorize("maintenance:assign"), assign);
router.patch("/:workOrderId/status", authorize("maintenance:update"), transition);
router.patch("/:workOrderId/checklist/:itemId", authorize("maintenance:update"), updateChecklistItem);
router.post("/:workOrderId/review", authorize("maintenance:approve"), review);
export default router;
