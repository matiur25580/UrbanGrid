import mongoose from "mongoose";

const customRoleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 240, default: "" },
  permissions: { type: [String], required: true, default: [] },
  status: { type: String, enum: ["active", "archived"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

customRoleSchema.index({ organizationId: 1, key: 1 }, { unique: true });

export const CustomRole = mongoose.models.CustomRole || mongoose.model("CustomRole", customRoleSchema);
