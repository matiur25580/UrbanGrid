import mongoose from "mongoose";

const organizationInvitationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  role: { type: String, required: true, maxlength: 64 },
  tokenHash: { type: String, required: true, unique: true, select: false },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true },
  acceptedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

organizationInvitationSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true, partialFilterExpression: { acceptedAt: null, revokedAt: null } }
);
organizationInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OrganizationInvitation = mongoose.models.OrganizationInvitation
  || mongoose.model("OrganizationInvitation", organizationInvitationSchema);
