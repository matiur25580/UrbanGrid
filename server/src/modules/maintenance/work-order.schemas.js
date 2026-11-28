import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "A valid identifier is required.");
export const createWorkOrderSchema = z.object({
  assetId: objectId,
  type: z.enum(["preventive", "corrective", "emergency", "inspection"]),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
  scheduledFor: z.coerce.date().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  assignedMembershipId: objectId.optional(),
  checklist: z.array(z.object({
    title: z.string().trim().min(2).max(160),
    required: z.boolean().optional().default(true)
  }).strict()).max(40).optional().default([]),
  estimatedCost: z.number().finite().min(0).nullable().optional()
}).strict().superRefine((value, ctx) => {
  if (value.scheduledFor && value.dueAt && value.dueAt < value.scheduledFor) {
    ctx.addIssue({ code: "custom", message: "Due date cannot be before the scheduled date.", path: ["dueAt"] });
  }
});
export const workOrderIdSchema = objectId;
export const workOrderListSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["planned", "open", "assigned", "in_progress", "pending_approval", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  type: z.enum(["preventive", "corrective", "emergency", "inspection"]).optional(),
  assetId: objectId.optional(),
  assignedMembershipId: objectId.optional(),
  dueBefore: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "dueAt", "scheduledFor", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
}).strict();
export const assignWorkOrderSchema = z.object({ membershipId: objectId }).strict();
export const transitionWorkOrderSchema = z.object({
  status: z.enum(["open", "in_progress", "pending_approval", "cancelled"]),
  resolution: z.string().trim().max(2000).optional(),
  actualCost: z.number().finite().min(0).optional()
}).strict().superRefine((value, ctx) => {
  if (value.status === "pending_approval" && !value.resolution) {
    ctx.addIssue({ code: "custom", message: "A completion summary is required.", path: ["resolution"] });
  }
});
export const reviewWorkOrderSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().default("")
}).strict();

export const checklistItemUpdateSchema = z.object({
  completed: z.boolean(),
  note: z.string().trim().max(500).optional()
}).strict();
