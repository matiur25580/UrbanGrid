import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  required: { type: Boolean, default: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 500, default: "" }
}, { _id: true });

const workOrderSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  workOrderCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
  type: { type: String, enum: ["preventive", "corrective", "emergency", "inspection"], required: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  status: { type: String, enum: ["planned", "open", "assigned", "in_progress", "pending_approval", "completed", "cancelled"], default: "open" },
  scheduledFor: { type: Date, default: null },
  dueAt: { type: Date, default: null },
  assignedMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", default: null },
  checklist: { type: [checklistItemSchema], default: [] },
  resolution: { type: String, trim: true, maxlength: 2000, default: "" },
  estimatedCost: { type: Number, min: 0, default: null },
  actualCost: { type: Number, min: 0, default: null },
  approval: {
    status: { type: String, enum: ["not_required", "pending", "approved", "rejected"], default: "not_required" },
    reviewerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 500, default: "" }
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

workOrderSchema.index({ organizationId: 1, workOrderCode: 1 }, { unique: true });
workOrderSchema.index({ organizationId: 1, assetId: 1, status: 1, dueAt: 1 });
workOrderSchema.index({ organizationId: 1, assignedMembershipId: 1, status: 1 });
workOrderSchema.index({ organizationId: 1, status: 1, priority: 1, scheduledFor: 1 });
workOrderSchema.index({ organizationId: 1, createdAt: -1 });

export const WorkOrder = mongoose.models.WorkOrder || mongoose.model("WorkOrder", workOrderSchema);
