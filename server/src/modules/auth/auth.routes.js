import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getRolePermissions } from "../organizations/organization.service.js";
import { register, login, refresh, logout, logoutAll, me, sessions, revokeSession } from "./auth.controller.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "AUTH_RATE_LIMITED", message: "Too many authentication attempts. Please try again later." }
  }
});

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, me);
router.get("/sessions", authenticate, sessions);
router.delete("/sessions/:sessionId", authenticate, revokeSession);
router.get("/permissions", authenticate, async (req, res, next) => {
  try {
    const permissions = await getRolePermissions(req.auth.organizationId, req.auth.role);
    res.json({ success: true, data: { role: req.auth.role, permissions } });
  } catch (error) {
    next(error);
  }
});
router.get("/admin-check", authenticate, authorize("organization:manage"), (_req, res) => {
  res.json({ success: true, data: { allowed: true } });
});

export default router;
