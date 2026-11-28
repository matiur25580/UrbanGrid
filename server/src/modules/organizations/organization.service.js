import crypto from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../../models/User.js";
import { Organization } from "../../models/Organization.js";
import { Membership } from "../../models/Membership.js";
import { RefreshSession } from "../../models/RefreshSession.js";
import { OrganizationInvitation } from "../../models/OrganizationInvitation.js";
import { CustomRole } from "../../models/CustomRole.js";
import { Department } from "../../models/Department.js";
import { Team } from "../../models/Team.js";
import { AuditEvent } from "../../models/AuditEvent.js";
import { createRefreshToken, hashRefreshToken, signAccessToken } from "../auth/auth.tokens.js";
import { ROLE_PERMISSIONS } from "../auth/permissions.js";

const INVITATION_DAYS = 7;
const BUILT_IN_ROLES = new Set(["organization_owner", "organization_admin", "operations_manager", "asset_manager", "maintenance_supervisor", "field_technician", "inspector", "finance_manager", "auditor", "contractor"]);

function id(value) { return String(value); }
function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
function validRole(role) { return BUILT_IN_ROLES.has(role) || /^[a-z][a-z0-9_-]{1,63}$/.test(role); }

async function writeAudit(req, { action, entityType, entityId = null, targetUserId = null, metadata = {} }) {
  await AuditEvent.create({
    organizationId: req.auth.organizationId,
    actorUserId: req.auth.userId,
    action, entityType, entityId: entityId ? id(entityId) : null, targetUserId,
    metadata, ipAddress: (req.ip || "").slice(0, 64),
    userAgent: (req.get("user-agent") || "").slice(0, 500)
  });
}

export async function getOrganizationsForUser(userId) {
  const memberships = await Membership.find({ userId, status: "active" })
    .select("organizationId role").lean();
  const organizations = await Organization.find({
    _id: { $in: memberships.map((m) => m.organizationId) }, status: "active"
  }).select("name slug status").lean();
  const byId = new Map(organizations.map((o) => [id(o._id), o]));
  return memberships.filter((m) => byId.has(id(m.organizationId))).map((m) => ({
    id: id(m.organizationId), name: byId.get(id(m.organizationId)).name,
    slug: byId.get(id(m.organizationId)).slug, role: m.role
  }));
}

export async function switchOrganization(userId, organizationId, req) {
  if (!mongoose.isValidObjectId(organizationId)) throw httpError(400, "INVALID_ORGANIZATION_ID", "The organization identifier is invalid.");
  const [user, membership, organization] = await Promise.all([
    User.findOne({ _id: userId, status: "active" }),
    Membership.findOne({ userId, organizationId, status: "active" }),
    Organization.findOne({ _id: organizationId, status: "active" })
  ]);
  if (!user || !membership || !organization) throw httpError(404, "ORGANIZATION_MEMBERSHIP_NOT_FOUND", "An active membership for this organization was not found.");
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await RefreshSession.create({
    userId, organizationId, membershipId: membership._id,
    tokenHash: hashRefreshToken(refreshToken), expiresAt,
    userAgent: (req.get("user-agent") || "").slice(0, 500),
    ipAddress: (req.ip || "").slice(0, 64)
  });
  const accessToken = signAccessToken({ userId, organizationId, membershipId: membership._id });
  await AuditEvent.create({
    organizationId, actorUserId: userId, action: "organization.context.switched",
    entityType: "organization", entityId: String(organizationId),
    metadata: { fromOrganizationId: req.auth.organizationId, toOrganizationId: String(organizationId) },
    ipAddress: (req.ip || "").slice(0, 64),
    userAgent: (req.get("user-agent") || "").slice(0, 500)
  });
  return {
    refreshToken, expiresAt, accessToken,
    organization: { id: id(organization._id), name: organization.name, slug: organization.slug },
    membership: { id: id(membership._id), role: membership.role }
  };
}

export async function listMembers(organizationId, { page = 1, limit = 25, search = "" } = {}) {
  const filter = { organizationId };
  if (search) {
    const safeSearch = search.replace(/[^a-z0-9 ]/gi, "");
    const matchingUsers = await User.find({
      $or: [{ name: { $regex: safeSearch, $options: "i" } }, { email: search.toLowerCase() }]
    }).select("_id").lean();
    filter.userId = { $in: matchingUsers.map((user) => user._id) };
  }
  const [memberships, total] = await Promise.all([
    Membership.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate("userId", "name email status").populate("departmentId", "name code").lean(),
    Membership.countDocuments(filter)
  ]);
  return { members: memberships.filter((m) => m.userId).map((m) => ({
    membershipId: id(m._id), user: { id: id(m.userId._id), name: m.userId.name, email: m.userId.email, status: m.userId.status },
    role: m.role, status: m.status, joinedAt: m.joinedAt,
    department: m.departmentId ? { id: id(m.departmentId._id), name: m.departmentId.name, code: m.departmentId.code } : null,
    teamIds: (m.teamIds || []).map(id)
  })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
export async function createInvitation(req, input) {
  if (!validRole(input.role)) throw httpError(400, "INVALID_ROLE", "Choose a valid built-in or custom role.");
  if (input.role === "organization_owner") throw httpError(409, "OWNER_TRANSFER_REQUIRED", "Organization ownership must be transferred through a dedicated workflow.");
  if (BUILT_IN_ROLES.has(input.role) === false) {
    const role = await CustomRole.findOne({ organizationId: req.auth.organizationId, key: input.role, status: "active" });
    if (!role) throw httpError(400, "ROLE_NOT_FOUND", "The selected role is not available in this organization.");
  }
  const existingUser = await User.findOne({ email: input.email }).select("_id");
  if (existingUser) {
    const existingMembership = await Membership.findOne({ organizationId: req.auth.organizationId, userId: existingUser._id });
    if (existingMembership?.status === "active") throw httpError(409, "MEMBER_ALREADY_EXISTS", "This user is already an active member.");
  }
  await OrganizationInvitation.updateMany({
    organizationId: req.auth.organizationId, email: input.email, acceptedAt: null, revokedAt: null
  }, { $set: { revokedAt: new Date() } });
  const token = crypto.randomBytes(32).toString("base64url");
  const invitation = await OrganizationInvitation.create({
    organizationId: req.auth.organizationId, email: input.email, role: input.role,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    invitedBy: req.auth.userId, expiresAt: new Date(Date.now() + INVITATION_DAYS * 86400000)
  });
  await writeAudit(req, { action: "organization.invitation.created", entityType: "invitation", entityId: invitation._id, metadata: { email: input.email, role: input.role } });
  return { id: id(invitation._id), email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt, token };
}

export async function acceptInvitation(token, input, req) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await OrganizationInvitation.findOne({
    tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() }
  }).select("+tokenHash");
  if (!invitation) throw httpError(400, "INVITATION_INVALID", "The invitation is invalid, expired, revoked, or already used.");

  const [organization, existingUser] = await Promise.all([
    Organization.findOne({ _id: invitation.organizationId, status: "active" }),
    User.findOne({ email: invitation.email }).select("+passwordHash")
  ]);
  if (!organization) throw httpError(403, "ORGANIZATION_UNAVAILABLE", "This organization is unavailable.");

  let user = existingUser;
  if (user) {
    const validPassword = user.status === "active" && await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) throw httpError(401, "INVITATION_CREDENTIALS_INVALID", "The invitation credentials are invalid.");
  } else {
    if (!input.name) throw httpError(400, "INVITATION_NAME_REQUIRED", "Your name is required to create your account.");
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      user = await User.create({ name: input.name, email: invitation.email, passwordHash });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      user = await User.findOne({ email: invitation.email }).select("+passwordHash");
      if (!user || user.status !== "active" || !await bcrypt.compare(input.password, user.passwordHash)) {
        throw httpError(401, "INVITATION_CREDENTIALS_INVALID", "The invitation credentials are invalid.");
      }
    }
  }

  const roleExists = BUILT_IN_ROLES.has(invitation.role) || await CustomRole.exists({
    organizationId: invitation.organizationId, key: invitation.role, status: "active"
  });
  if (!roleExists) throw httpError(409, "INVITATION_ROLE_UNAVAILABLE", "The invited role is no longer available.");
  const existingMembership = await Membership.findOne({ organizationId: invitation.organizationId, userId: user._id });
  if (existingMembership?.status === "active") throw httpError(409, "MEMBER_ALREADY_EXISTS", "You are already an active member of this organization.");

  const claimed = await OrganizationInvitation.findOneAndUpdate({
    _id: invitation._id, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() }
  }, { $set: { acceptedAt: new Date() } }, { new: false });
  if (!claimed) throw httpError(400, "INVITATION_INVALID", "The invitation is invalid, expired, revoked, or already used.");

  let membership;
  try {
    membership = await Membership.findOneAndUpdate(
      { organizationId: invitation.organizationId, userId: user._id },
      { $set: { role: invitation.role, status: "active", joinedAt: new Date() } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    await OrganizationInvitation.updateOne({ _id: invitation._id }, { $set: { acceptedAt: null } });
    throw error;
  }

  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await RefreshSession.create({
    userId: user._id, organizationId: organization._id, membershipId: membership._id,
    tokenHash: hashRefreshToken(refreshToken), expiresAt,
    userAgent: (req.get("user-agent") || "").slice(0, 500),
    ipAddress: (req.ip || "").slice(0, 64)
  });
  const accessToken = signAccessToken({
    userId: user._id, organizationId: organization._id, membershipId: membership._id
  });
  await AuditEvent.create({
    organizationId: organization._id, actorUserId: user._id,
    action: "organization.invitation.accepted", entityType: "membership", entityId: id(membership._id),
    targetUserId: user._id, metadata: { invitationId: id(invitation._id) }
  });
  return {
    user: { id: id(user._id), name: user.name, email: user.email },
    organization: { id: id(organization._id), name: organization.name, slug: organization.slug },
    membership: { id: id(membership._id), role: membership.role },
    accessToken, refreshToken, expiresAt
  };
}

export async function updateMember(req, membershipId, input) {
  if (!mongoose.isValidObjectId(membershipId)) throw httpError(400, "INVALID_MEMBERSHIP_ID", "The membership identifier is invalid.");
  const membership = await Membership.findOne({ _id: membershipId, organizationId: req.auth.organizationId });
  if (!membership) throw httpError(404, "MEMBER_NOT_FOUND", "The organization member was not found.");
  if (membership.role === "organization_owner" && req.auth.role !== "organization_owner") throw httpError(403, "OWNER_PROTECTED", "Only the organization owner can change the owner's membership.");
  if (membership.userId.toString() === req.auth.userId && input.status === "suspended") throw httpError(409, "SELF_SUSPENSION_NOT_ALLOWED", "You cannot suspend your own membership.");
  if (input.role) {
    if (!validRole(input.role)) throw httpError(400, "INVALID_ROLE", "The role is invalid.");
    if (input.role === "organization_owner" && membership.role !== "organization_owner") {
      throw httpError(409, "OWNER_TRANSFER_REQUIRED", "Organization ownership must be transferred through a dedicated workflow.");
    }
    if (!BUILT_IN_ROLES.has(input.role) && !await CustomRole.exists({ organizationId: req.auth.organizationId, key: input.role, status: "active" })) {
      throw httpError(400, "ROLE_NOT_FOUND", "The selected role is not available in this organization.");
    }
    if (membership.role === "organization_owner" && input.role !== "organization_owner") {
      throw httpError(409, "OWNER_TRANSFER_REQUIRED", "Transfer organization ownership before changing the owner role.");
    }
    membership.role = input.role;
  }
  if (input.status) membership.status = input.status;
  if (Object.hasOwn(input, "departmentId")) {
    if (input.departmentId && !await Department.exists({ _id: input.departmentId, organizationId: req.auth.organizationId, status: "active" })) {
      throw httpError(400, "DEPARTMENT_NOT_FOUND", "The department is not part of this organization.");
    }
    membership.departmentId = input.departmentId;
  }
  if (input.teamIds) {
    const teams = await Team.find({ _id: { $in: input.teamIds }, organizationId: req.auth.organizationId, status: "active" }).select("_id").lean();
    if (teams.length !== new Set(input.teamIds).size) throw httpError(400, "TEAM_SCOPE_INVALID", "All teams must belong to this organization and be active.");
    membership.teamIds = teams.map((team) => team._id);
  }
  await membership.save();
  await writeAudit(req, { action: "organization.member.updated", entityType: "membership", entityId: membership._id, targetUserId: membership.userId, metadata: input });
  return { membershipId: id(membership._id), role: membership.role, status: membership.status, departmentId: membership.departmentId ? id(membership.departmentId) : null, teamIds: (membership.teamIds || []).map(id) };
}

export async function createCustomRole(req, input) {
  if (BUILT_IN_ROLES.has(input.key)) throw httpError(409, "ROLE_KEY_RESERVED", "This role key is reserved.");
  const role = await CustomRole.create({ ...input, organizationId: req.auth.organizationId, createdBy: req.auth.userId });
  await writeAudit(req, { action: "organization.role.created", entityType: "custom_role", entityId: role._id, metadata: { key: role.key, permissions: role.permissions } });
  return role.toObject();
}

export async function updateCustomRole(req, roleId, input) {
  if (!mongoose.isValidObjectId(roleId)) throw httpError(400, "INVALID_ROLE_ID", "The role identifier is invalid.");
  const role = await CustomRole.findOne({ _id: roleId, organizationId: req.auth.organizationId });
  if (!role) throw httpError(404, "ROLE_NOT_FOUND", "The custom role was not found.");
  if (input.status === "archived" && await Membership.exists({ organizationId: req.auth.organizationId, role: role.key, status: "active" })) {
    throw httpError(409, "ROLE_IN_USE", "Reassign active members before archiving this role.");
  }
  Object.assign(role, input);
  await role.save();
  await writeAudit(req, { action: "organization.role.updated", entityType: "custom_role", entityId: role._id, metadata: input });
  return role.toObject();
}

export async function listCustomRoles(organizationId) {
  const custom = await CustomRole.find({ organizationId, status: "active" }).sort({ name: 1 }).lean();
  const builtIn = Object.entries(ROLE_PERMISSIONS).map(([key, permissions]) => ({ key, name: key.replaceAll("_", " "), permissions, builtIn: true }));
  return [...builtIn, ...custom.map((role) => ({ id: id(role._id), key: role.key, name: role.name, description: role.description, permissions: role.permissions, builtIn: false }))];
}

export async function createDepartment(req, input) {
  const department = await Department.create({ ...input, organizationId: req.auth.organizationId, createdBy: req.auth.userId });
  await writeAudit(req, { action: "organization.department.created", entityType: "department", entityId: department._id, metadata: { code: department.code } });
  return department.toObject();
}

export async function listDepartments(organizationId) {
  return Department.find({ organizationId, status: "active" }).sort({ name: 1 }).lean();
}

export async function createTeam(req, input) {
  if (input.departmentId && !await Department.exists({ _id: input.departmentId, organizationId: req.auth.organizationId, status: "active" })) {
    throw httpError(400, "DEPARTMENT_NOT_FOUND", "The department is not part of this organization.");
  }
  const membershipIds = [...new Set([...(input.memberIds || []), ...(input.managerMembershipId ? [input.managerMembershipId] : [])])];
  if (membershipIds.length) {
    const count = await Membership.countDocuments({ _id: { $in: membershipIds }, organizationId: req.auth.organizationId, status: "active" });
    if (count !== membershipIds.length) throw httpError(400, "TEAM_MEMBER_SCOPE_INVALID", "Every team member must be an active member of this organization.");
  }
  const team = await Team.create({ ...input, organizationId: req.auth.organizationId, createdBy: req.auth.userId });
  await writeAudit(req, { action: "organization.team.created", entityType: "team", entityId: team._id, metadata: { slug: team.slug } });
  return team.toObject();
}

export async function listTeams(organizationId) {
  return Team.find({ organizationId, status: "active" }).sort({ name: 1 })
    .populate("departmentId", "name code").populate("managerMembershipId", "userId role")
    .lean();
}

export async function updateTeam(req, teamId, input) {
  if (!mongoose.isValidObjectId(teamId)) throw httpError(400, "INVALID_TEAM_ID", "The team identifier is invalid.");
  const team = await Team.findOne({ _id: teamId, organizationId: req.auth.organizationId });
  if (!team) throw httpError(404, "TEAM_NOT_FOUND", "The team was not found.");
  if (input.departmentId && !await Department.exists({ _id: input.departmentId, organizationId: req.auth.organizationId, status: "active" })) {
    throw httpError(400, "DEPARTMENT_NOT_FOUND", "The department is not part of this organization.");
  }
  const managerMembershipId = Object.hasOwn(input, "managerMembershipId") ? input.managerMembershipId : team.managerMembershipId;
  const membershipIds = [...new Set([...(input.memberIds || team.memberIds.map(id)), ...(managerMembershipId ? [managerMembershipId] : [])])];
  if (membershipIds.length) {
    const count = await Membership.countDocuments({ _id: { $in: membershipIds }, organizationId: req.auth.organizationId, status: "active" });
    if (count !== membershipIds.length) throw httpError(400, "TEAM_MEMBER_SCOPE_INVALID", "Every team member must be an active member of this organization.");
  }
  Object.assign(team, input);
  await team.save();
  await writeAudit(req, { action: "organization.team.updated", entityType: "team", entityId: team._id, metadata: input });
  return team.toObject();
}

export async function listAuditEvents(organizationId, { page = 1, limit = 50, entityType } = {}) {
  const filter = { organizationId };
  if (entityType) filter.entityType = entityType;
  const [events, total] = await Promise.all([
    AuditEvent.find(filter).sort({ occurredAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate("actorUserId", "name email").populate("targetUserId", "name email").lean(),
    AuditEvent.countDocuments(filter)
  ]);
  return { events: events.map((event) => ({
    id: id(event._id), action: event.action, entityType: event.entityType, entityId: event.entityId,
    actor: event.actorUserId ? { id: id(event.actorUserId._id), name: event.actorUserId.name, email: event.actorUserId.email } : null,
    target: event.targetUserId ? { id: id(event.targetUserId._id), name: event.targetUserId.name, email: event.targetUserId.email } : null,
    metadata: event.metadata, occurredAt: event.occurredAt
  })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getRolePermissions(organizationId, roleKey) {
  if (ROLE_PERMISSIONS[roleKey]) return ROLE_PERMISSIONS[roleKey];
  const role = await CustomRole.findOne({ organizationId, key: roleKey, status: "active" }).select("permissions").lean();
  return role?.permissions || [];
}
