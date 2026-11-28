import mongoose from "mongoose";

const assetCounterSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  scope: { type: String, required: true, default: "asset" },
  sequence: { type: Number, required: true, default: 0, min: 0 }
}, { timestamps: true });

assetCounterSchema.index({ organizationId: 1, scope: 1 }, { unique: true });

export const AssetCounter = mongoose.models.AssetCounter || mongoose.model("AssetCounter", assetCounterSchema);
