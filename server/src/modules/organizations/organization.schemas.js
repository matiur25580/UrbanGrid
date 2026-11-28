import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "A valid identifier is required");
const roleKey = z.string().trim().min(2).max(64).regex(/^[a-z][a-z0-9_-]*$/);
const allowedPermissions = [
  "dashboard:read", "assets:read", "assets:create", "assets:update", "assets:archive", "assets:categories:manage", "assets:documents:manage",
  "maintenance:read", "maintenance:create", "maintenance:assign", "maintenance:approve", "maintenance:update",
  "inspections:read", "inspections:create", "inspections:approve", "incidents:read", "incidents:create", "incidents:manage",
  "workforce:read", "workforce:manage", "analytics:read", "finance:read", "finance:manage", "audit:read",
  "organization:manage", "org:members:read", "org:members:manage", "org:invitations:manage",
  "org:roles:manage", "org:teams:manage", "org:departments:manage", "org:audit:read"
];

export const inviteSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  role: roleKey
}).strict();

const strongPassword = z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
export const acceptInvitationSchema = z.object({
  token: z.string().min(40).max(200),
  password: strongPassword,
  name: z.string().trim().min(2).max(100).optional()
}).strict();
export const memberUpdateSchema = z.object({
  role: roleKey.optional(),
  status: z.enum(["active", "suspended"]).optional(),
  departmentId: objectId.nullable().optional(),
  teamIds: z.array(objectId).max(30).optional()
}).strict().refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const customRoleSchema = z.object({
  key: roleKey,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().default(""),
  permissions: z.array(z.enum(allowedPermissions)).min(1).max(40)
}).strict();

export const updateCustomRoleSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).optional(),
  permissions: z.array(z.enum(allowedPermissions)).min(1).max(40).optional(),
  status: z.enum(["active", "archived"]).optional()
}).strict().refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(24).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().trim().max(300).optional().default("")
}).strict();

export const teamSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(300).optional().default(""),
  departmentId: objectId.nullable().optional(),
  managerMembershipId: objectId.nullable().optional(),
  memberIds: z.array(objectId).max(100).optional().default([])
}).strict();

export const updateTeamSchema = teamSchema.partial().strict().refine((v) => Object.keys(v).length > 0, "At least one field is required");
