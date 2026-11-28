import mongoose from "mongoose";

const metadataFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 48, match: /^[a-z][a-z0-9_]*$/ },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  type: { type: String, enum: ["text", "number", "boolean", "date", "select"], required: true },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
  unit: { type: String, trim: true, maxlength: 24, default: "" }
}, { _id: false });

const assetCategorySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 48, match: /^[a-z][a-z0-9_-]*$/ },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 300, default: "" },
  metadataFields: { type: [metadataFieldSchema], default: [] },
  status: { type: String, enum: ["active", "archived"], default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

assetCategorySchema.index({ organizationId: 1, key: 1 }, { unique: true });
assetCategorySchema.index({ organizationId: 1, status: 1, name: 1 });

export const AssetCategory = mongoose.models.AssetCategory || mongoose.model("AssetCategory", assetCategorySchema);
