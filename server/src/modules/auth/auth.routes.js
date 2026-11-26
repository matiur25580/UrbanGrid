import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { register, login, refresh, logout, logoutAll, me, sessions } from "./auth.controller.js";

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

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, me);
router.get("/sessions", authenticate, sessions);
router.get("/permissions", authenticate, (req, res) => {
  res.json({
    success: true,
    data: { role: req.auth.role, permissions: req.auth.role === "organization_owner" || req.auth.role === "organization_admin" ? ["*"] : undefined }
  });
});
router.get("/admin-check", authenticate, authorize("organization:manage"), (_req, res) => {
  res.json({ success: true, data: { allowed: true } });
});

export default router;
