import { WorkOrder } from "../../models/WorkOrder.js";
import { Asset } from "../../models/Asset.js";
import { AssetCounter } from "../../models/AssetCounter.js";
import { Membership } from "../../models/Membership.js";
import { AuditEvent } from "../../models/AuditEvent.js";

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
const id = (value) => String(value);

export const WORK_ORDER_TRANSITIONS = Object.freeze({
  planned: ["open", "cancelled"],
  open: ["assigned", "cancelled"],
  assigned: ["open", "in_progress", "cancelled"],
  in_progress: ["pending_approval", "cancelled"],
  pending_approval: ["completed", "in_progress"],
  completed: [],
  cancelled: []
});

export function canTransitionWorkOrder(from, to) {
  return (WORK_ORDER_TRANSITIONS[from] || []).includes(to);
}

async function writeAudit(req, action, workOrder, metadata = {}) {
  await AuditEvent.create({
    organizationId: req.auth.organizationId,
    actorUserId: req.auth.userId,
    action,
    entityType: "work_order",
    entityId: id(workOrder._id),
    metadata,
    ipAddress: (req.ip || "").slice(0, 64),
    userAgent: (req.get("user-agent") || "").slice(0, 500)
  });
}

async function nextCode(organizationId) {
  const counter = await AssetCounter.findOneAndUpdate(
    { organizationId, scope: "work_order" },
    { $inc: { sequence: 1 }, $setOnInsert: { organizationId, scope: "work_order" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `WO-${String(counter.sequence).padStart(6, "0")}`;
}

async function requireAsset(organizationId, assetId) {
  const asset = await Asset.findOne({ _id: assetId, organizationId, status: { $nin: ["archived", "retired", "decommissioned"] } }).select("_id assetCode name status criticality");
  if (!asset) throw httpError(404, "WORK_ORDER_ASSET_NOT_FOUND", "The asset was not found or is not eligible for maintenance.");
  return asset;
}

async function requireMember(organizationId, membershipId) {
  const member = await Membership.findOne({ _id: membershipId, organizationId, status: "active" }).select("_id");
  if (!member) throw httpError(400, "WORK_ORDER_ASSIGNEE_INVALID", "The assignee must be an active member of this organization.");
}

function serialize(workOrder) {
  const value = workOrder.toObject ? workOrder.toObject() : workOrder;
  value.id = id(value._id);
  delete value._id;
  delete value.__v;
  if (value.assetId && value.assetId._id) {
    value.asset = { id: id(value.assetId._id), assetCode: value.assetId.assetCode, name: value.assetId.name, status: value.assetId.status };
    value.assetId = id(value.assetId._id);
  } else if (value.assetId) value.assetId = id(value.assetId);
  if (value.assignedMembershipId && value.assignedMembershipId._id) {
    value.assignee = { membershipId: id(value.assignedMembershipId._id), role: value.assignedMembershipId.role };
    value.assignedMembershipId = id(value.assignedMembershipId._id);
  } else if (value.assignedMembershipId) value.assignedMembershipId = id(value.assignedMembershipId);
  return value;
}

export async function createWorkOrder(req, input) {
  const organizationId = req.auth.organizationId;
  await requireAsset(organizationId, input.assetId);
  if (input.assignedMembershipId) await requireMember(organizationId, input.assignedMembershipId);
  const workOrderCode = await nextCode(organizationId);
  const status = input.scheduledFor && new Date(input.scheduledFor) > new Date() ? "planned" : "open";
  const workOrder = await WorkOrder.create({
    ...input, workOrderCode, organizationId, status,
    requestedBy: req.auth.userId, createdBy: req.auth.userId, updatedBy: req.auth.userId,
    ...(input.assignedMembershipId ? { status: "assigned" } : {})
  });
  await writeAudit(req, "maintenance.work_order.created", workOrder, { workOrderCode, assetId: id(workOrder.assetId), priority: workOrder.priority });
  return serialize(await WorkOrder.findOne({ _id: workOrder._id, organizationId }).populate("assetId", "assetCode name status").populate("assignedMembershipId", "role").lean());
}

export async function listWorkOrders(organizationId, query) {
  const filter = { organizationId };
  for (const key of ["status", "priority", "type", "assetId", "assignedMembershipId"]) {
    if (query[key]) filter[key] = query[key];
  }
  if (query.dueBefore) filter.dueAt = { $lte: query.dueBefore };
  if (query.search) filter.$or = [
    { workOrderCode: new RegExp(query.search.replace(/[^a-z0-9_-]/gi, ""), "i") },
    { title: new RegExp(query.search.replace(/[^a-z0-9 _-]/gi, ""), "i") }
  ];
  const [items, total] = await Promise.all([
    WorkOrder.find(filter).sort({ [query.sortBy]: query.sortOrder === "asc" ? 1 : -1, _id: 1 })
      .skip((query.page - 1) * query.limit).limit(query.limit)
      .populate("assetId", "assetCode name status").populate("assignedMembershipId", "role").lean(),
    WorkOrder.countDocuments(filter)
  ]);
  return { workOrders: items.map(serialize), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
}

export async function getWorkOrder(organizationId, workOrderId) {
  const item = await WorkOrder.findOne({ _id: workOrderId, organizationId })
    .populate("assetId", "assetCode name status criticality")
    .populate("assignedMembershipId", "role departmentId teamIds").lean();
  if (!item) throw httpError(404, "WORK_ORDER_NOT_FOUND", "The work order was not found.");
  return serialize(item);
}

export async function assignWorkOrder(req, workOrderId, membershipId) {
  const organizationId = req.auth.organizationId;
  await requireMember(organizationId, membershipId);
  const item = await WorkOrder.findOne({ _id: workOrderId, organizationId });
  if (!item) throw httpError(404, "WORK_ORDER_NOT_FOUND", "The work order was not found.");
  if (!["open", "assigned"].includes(item.status)) throw httpError(409, "WORK_ORDER_NOT_ASSIGNABLE", "Only open or assigned work orders can be assigned.");
  item.assignedMembershipId = membershipId;
  item.status = "assigned";
  item.updatedBy = req.auth.userId;
  await item.save();
  await writeAudit(req, "maintenance.work_order.assigned", item, { assignedMembershipId: id(membershipId) });
  return getWorkOrder(organizationId, item._id);
}

export async function transitionWorkOrder(req, workOrderId, input) {
  const organizationId = req.auth.organizationId;
  const item = await WorkOrder.findOne({ _id: workOrderId, organizationId });
  if (!item) throw httpError(404, "WORK_ORDER_NOT_FOUND", "The work order was not found.");
  const previousStatus = item.status;
  if (!canTransitionWorkOrder(previousStatus, input.status)) throw httpError(409, "WORK_ORDER_TRANSITION_INVALID", `Cannot move a work order from ${previousStatus} to ${input.status}.`);
  if (input.status === "in_progress" && !item.assignedMembershipId) throw httpError(409, "WORK_ORDER_ASSIGNEE_REQUIRED", "Assign a technician before starting work.");
  if (input.status === "pending_approval") {
    const required = item.checklist.filter((entry) => entry.required && !entry.completed);
    if (required.length) throw httpError(409, "WORK_ORDER_CHECKLIST_INCOMPLETE", "Complete all required checklist items before requesting approval.");
    if (!input.resolution) throw httpError(400, "WORK_ORDER_RESOLUTION_REQUIRED", "Provide a completion summary for approval.");
    item.approval.status = "pending";
    item.resolution = input.resolution;
    if (input.actualCost !== undefined) item.actualCost = input.actualCost;
  }
  if (input.status === "completed") {
    if (item.approval.status !== "approved") throw httpError(409, "WORK_ORDER_APPROVAL_REQUIRED", "A supervisor must approve this work order before completion.");
    item.completedAt = new Date();
  }
  if (input.status === "cancelled") item.cancelledAt = new Date();
  item.status = input.status;
  item.updatedBy = req.auth.userId;
  await item.save();
  await writeAudit(req, `maintenance.work_order.${input.status}`, item, { fromStatus: previousStatus, toStatus: input.status });
  return getWorkOrder(organizationId, item._id);
}

export async function reviewWorkOrder(req, workOrderId, input) {
  const organizationId = req.auth.organizationId;
  const item = await WorkOrder.findOne({ _id: workOrderId, organizationId, status: "pending_approval", "approval.status": "pending" });
  if (!item) throw httpError(404, "WORK_ORDER_PENDING_APPROVAL_NOT_FOUND", "A work order awaiting approval was not found.");
  if (String(item.requestedBy) === String(req.auth.userId)) throw httpError(403, "WORK_ORDER_SELF_APPROVAL_BLOCKED", "The requester cannot approve their own work order.");
  item.approval.status = input.decision === "approve" ? "approved" : "rejected";
  item.approval.reviewerUserId = req.auth.userId;
  item.approval.reviewedAt = new Date();
  item.approval.note = input.note || "";
  item.status = input.decision === "approve" ? "completed" : "in_progress";
  if (input.decision === "approve") item.completedAt = new Date();
  item.updatedBy = req.auth.userId;
  await item.save();
  if (input.decision === "approve") {
    await Asset.updateOne(
      { _id: item.assetId, organizationId, status: { $nin: ["archived", "retired", "decommissioned"] } },
      { $push: { maintenanceHistory: {
        workOrderId: item._id, completedAt: item.completedAt,
        summary: item.resolution, ...(item.actualCost !== null ? { cost: item.actualCost } : {})
      } } }
    );
  }
  await writeAudit(req, `maintenance.work_order.${input.decision === "approve" ? "approved" : "rejected"}`, item, { note: item.approval.note });
  return getWorkOrder(organizationId, item._id);
}

export async function updateWorkOrderChecklistItem(req, workOrderId, itemId, input) {
  const organizationId = req.auth.organizationId;
  const item = await WorkOrder.findOne({ _id: workOrderId, organizationId });
  if (!item) throw httpError(404, "WORK_ORDER_NOT_FOUND", "The work order was not found.");
  if (!["assigned", "in_progress"].includes(item.status)) throw httpError(409, "WORK_ORDER_CHECKLIST_LOCKED", "Checklist items can only be updated while work is assigned or in progress.");
  const checklistItem = item.checklist.id(itemId);
  if (!checklistItem) throw httpError(404, "WORK_ORDER_CHECKLIST_ITEM_NOT_FOUND", "The checklist item was not found.");
  checklistItem.completed = input.completed;
  checklistItem.completedAt = input.completed ? new Date() : null;
  if (input.note !== undefined) checklistItem.note = input.note;
  item.updatedBy = req.auth.userId;
  await item.save();
  await writeAudit(req, "maintenance.work_order.checklist_item_updated", item, {
    checklistItemId: id(checklistItem._id), completed: checklistItem.completed
  });
  return getWorkOrder(organizationId, item._id);
}
