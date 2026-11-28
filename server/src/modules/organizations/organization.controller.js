import { z } from "zod";
import { setRefreshCookie } from "../auth/auth.cookies.js";
import {
  getOrganizationsForUser, switchOrganization, listMembers, createInvitation, acceptInvitation,
  updateMember, createCustomRole, updateCustomRole, listCustomRoles, createDepartment, listDepartments,
  createTeam, listTeams, updateTeam, listAuditEvents, getRolePermissions
} from "./organization.service.js";
import {
  inviteSchema, acceptInvitationSchema, memberUpdateSchema, customRoleSchema,
  updateCustomRoleSchema, departmentSchema, teamSchema, updateTeamSchema
} from "./organization.schemas.js";

const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);
function parse(res, schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Please check the supplied information.", details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) } });
    return null;
  }
  return result.data;
}
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
function pageOptions(query, allowSearch = false) {
  return {
    page: Math.max(1, Math.min(100000, Number.parseInt(query.page, 10) || 1)),
    limit: Math.max(1, Math.min(100, Number.parseInt(query.limit, 10) || (allowSearch ? 25 : 50))),
    ...(allowSearch && typeof query.search === "string" ? { search: query.search.slice(0, 80) } : {}),
    ...(typeof query.entityType === "string" ? { entityType: query.entityType.slice(0, 80) } : {})
  };
}

export const organizationsForMe = asyncHandler(async (req, res) => {
  const organizations = await getOrganizationsForUser(req.auth.userId);
  res.json({ success: true, data: { organizations } });
});

export const switchOrganizationContext = asyncHandler(async (req, res) => {
  const body = parse(res, z.object({ organizationId: idSchema }).strict(), req.body);
  if (!body) return;
  const result = await switchOrganization(req.auth.userId, body.organizationId, req);
  setRefreshCookie(res, result.refreshToken, result.expiresAt);
  res.json({ success: true, data: { accessToken: result.accessToken, organization: result.organization, membership: result.membership } });
});

export const getMembers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listMembers(req.auth.organizationId, pageOptions(req.query, true)) });
});

export const inviteMember = asyncHandler(async (req, res) => {
  const body = parse(res, inviteSchema, req.body); if (!body) return;
  const invitation = await createInvitation(req, body);
  res.status(201).json({ success: true, data: { invitation, delivery: { status: "manual", note: "Send the one-time invitation token through your approved communication channel." } } });
});

export const acceptMemberInvitation = asyncHandler(async (req, res) => {
  const body = parse(res, acceptInvitationSchema, req.body); if (!body) return;
  const result = await acceptInvitation(body.token, body, req);
  setRefreshCookie(res, result.refreshToken, result.expiresAt);
  res.status(200).json({ success: true, data: {
    user: result.user, organization: result.organization, membership: result.membership,
    accessToken: result.accessToken
  } });
});

export const changeMember = asyncHandler(async (req, res) => {
  const body = parse(res, memberUpdateSchema, req.body); if (!body) return;
  res.json({ success: true, data: { member: await updateMember(req, req.params.membershipId, body) } });
});

export const getRoles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { roles: await listCustomRoles(req.auth.organizationId) } });
});

export const createRole = asyncHandler(async (req, res) => {
  const body = parse(res, customRoleSchema, req.body); if (!body) return;
  res.status(201).json({ success: true, data: { role: await createCustomRole(req, body) } });
});

export const changeRole = asyncHandler(async (req, res) => {
  const body = parse(res, updateCustomRoleSchema, req.body); if (!body) return;
  res.json({ success: true, data: { role: await updateCustomRole(req, req.params.roleId, body) } });
});

export const getCurrentPermissions = asyncHandler(async (req, res) => {
  const permissions = await getRolePermissions(req.auth.organizationId, req.auth.role);
  res.json({ success: true, data: { role: req.auth.role, permissions } });
});

export const getDepartments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { departments: await listDepartments(req.auth.organizationId) } });
});

export const addDepartment = asyncHandler(async (req, res) => {
  const body = parse(res, departmentSchema, req.body); if (!body) return;
  res.status(201).json({ success: true, data: { department: await createDepartment(req, body) } });
});

export const getTeams = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { teams: await listTeams(req.auth.organizationId) } });
});

export const addTeam = asyncHandler(async (req, res) => {
  const body = parse(res, teamSchema, req.body); if (!body) return;
  res.status(201).json({ success: true, data: { team: await createTeam(req, body) } });
});

export const changeTeam = asyncHandler(async (req, res) => {
  const body = parse(res, updateTeamSchema, req.body); if (!body) return;
  res.json({ success: true, data: { team: await updateTeam(req, req.params.teamId, body) } });
});

export const getAuditEvents = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await listAuditEvents(req.auth.organizationId, pageOptions(req.query)) });
});
