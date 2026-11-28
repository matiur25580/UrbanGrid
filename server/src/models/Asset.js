import mongoose from "mongoose";

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ["Point"], required: true, default: "Point" },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (value) => value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90,
      message: "Coordinates must be [longitude, latitude] within valid ranges."
    }
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true, trim: true, maxlength: 180 },
  mimeType: { type: String, required: true, enum: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
  sizeBytes: { type: Number, required: true, min: 1, max: 26214400 },
  checksumSha256: { type: String, trim: true, lowercase: true, match: /^[a-f0-9]{64}$/ },
  description: { type: String, trim: true, maxlength: 240, default: "" },
  status: { type: String, enum: ["awaiting_upload", "stored", "quarantined"], default: "awaiting_upload" },
  storageProvider: { type: String, enum: ["none", "s3", "cloudinary"], default: "none" },
  storageKey: { type: String, select: false, default: null },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addedAt: { type: Date, default: Date.now }
}, { _id: true });

const assetSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  assetCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "AssetCategory", required: true },
  serialNumber: { type: String, trim: true, maxlength: 120, default: "" },
  manufacturer: { type: String, trim: true, maxlength: 120, default: "" },
  modelNumber: { type: String, trim: true, maxlength: 120, default: "" },
  acquisitionDate: { type: Date, default: null },
  warrantyExpiryDate: { type: Date, default: null },
  criticality: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  status: { type: String, enum: ["active", "under_maintenance", "decommissioned", "retired", "archived"], default: "active" },
  assignedMembershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", default: null },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", default: null },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  location: { type: pointSchema, default: null },
  address: { type: String, trim: true, maxlength: 300, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  documents: { type: [documentSchema], default: [] },
  maintenanceHistory: [{
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
    completedAt: Date,
    summary: { type: String, trim: true, maxlength: 500 },
    cost: { type: Number, min: 0 }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  archivedAt: { type: Date, default: null }
}, { timestamps: true, minimize: false });

assetSchema.index({ organizationId: 1, assetCode: 1 }, { unique: true });
assetSchema.index({ organizationId: 1, categoryId: 1, status: 1 });
assetSchema.index({ organizationId: 1, status: 1, criticality: 1 });
assetSchema.index({ organizationId: 1, serialNumber: 1 }, { partialFilterExpression: { serialNumber: { $type: "string", $gt: "" } } });
assetSchema.index({ organizationId: 1, name: 1 });
assetSchema.index({ location: "2dsphere" });

export const Asset = mongoose.models.Asset || mongoose.model("Asset", assetSchema);
