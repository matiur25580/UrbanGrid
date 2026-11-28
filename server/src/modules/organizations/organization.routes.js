import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  organizationsForMe, switchOrganizationContext, getMembers, inviteMember, acceptMemberInvitation,
  changeMember, getRoles, createRole, changeRole, getCurrentPermissions, getDepartments,
  addDepartment, getTeams, addTeam, changeTeam, getAuditEvents
} from "./organization.controller.js";

const router = Router();
const invitationAcceptanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.post("/invitations/accept", invitationAcceptanceLimiter, acceptMemberInvitation);
router.use(authenticate);

router.get("/mine", organizationsForMe);
router.post("/switch", switchOrganizationContext);
router.get("/members", authorize("org:members:read"), getMembers);
router.post("/invitations", authorize("org:invitations:manage"), inviteMember);
router.patch("/members/:membershipId", authorize("org:members:manage"), changeMember);
router.get("/roles", authorize("org:members:read"), getRoles);
router.post("/roles", authorize("org:roles:manage"), createRole);
router.patch("/roles/:roleId", authorize("org:roles:manage"), changeRole);
router.get("/permissions", getCurrentPermissions);
router.get("/departments", authorize("org:members:read"), getDepartments);
router.post("/departments", authorize("org:departments:manage"), addDepartment);
router.get("/teams", authorize("org:members:read"), getTeams);
router.post("/teams", authorize("org:teams:manage"), addTeam);
router.patch("/teams/:teamId", authorize("org:teams:manage"), changeTeam);
router.get("/audit", authorize("org:audit:read"), getAuditEvents);

export default router;
