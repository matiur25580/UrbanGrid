import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  slug: { type: String, required: true, trim: true, lowercase: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  settings: {
    timezone: { type: String, default: "Asia/Kolkata" },
    locale: { type: String, default: "en-IN" }
  }
}, { timestamps: true });

organizationSchema.index({ slug: 1 }, { unique: true });

export const Organization = mongoose.models.Organization || mongoose.model("Organization", organizationSchema);
