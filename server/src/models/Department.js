import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  status: { type: String, enum: ["active", "archived"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
