import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true, maxlength: 120 },
  entityType: { type: String, required: true, maxlength: 80 },
  entityId: { type: String, default: null, maxlength: 100 },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, maxlength: 64, default: "" },
  userAgent: { type: String, maxlength: 500, default: "" },
  occurredAt: { type: Date, required: true, default: Date.now }
}, { timestamps: false });

auditEventSchema.index({ organizationId: 1, occurredAt: -1 });
auditEventSchema.index({ organizationId: 1, entityType: 1, entityId: 1, occurredAt: -1 });

export const AuditEvent = mongoose.models.AuditEvent || mongoose.model("AuditEvent", auditEventSchema);
