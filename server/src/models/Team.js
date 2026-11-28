import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  managerMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", default: null },
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Membership" }],
  status: { type: String, enum: ["active", "archived"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

teamSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

export const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);
