import mongoose from "mongoose";

export const ORGANIZATION_ROLES = [
  "organization_owner", "organization_admin", "operations_manager",
  "asset_manager", "maintenance_supervisor", "field_technician",
  "inspector", "finance_manager", "auditor", "contractor"
];

const membershipSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ORGANIZATION_ROLES, required: true },
  status: { type: String, enum: ["active", "suspended", "invited"], default: "active", required: true },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1 });

export const Membership = mongoose.models.Membership || mongoose.model("Membership", membershipSchema);
