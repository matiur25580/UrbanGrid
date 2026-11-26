import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership", required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  replacedBySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "RefreshSession", default: null },
  userAgent: { type: String, maxlength: 500, default: "" },
  ipAddress: { type: String, maxlength: 64, default: "" },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export const RefreshSession = mongoose.models.RefreshSession || mongoose.model("RefreshSession", refreshSessionSchema);
