import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "A valid identifier is required");
const metadataFieldSchema = z.object({
  key: z.string().trim().toLowerCase().min(1).max(48).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(2).max(80),
  type: z.enum(["text", "number", "boolean", "date", "select"]),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]),
  unit: z.string().trim().max(24).optional().default("")
}).strict().superRefine((field, ctx) => {
  if (field.type === "select" && field.options.length < 1) ctx.addIssue({ code: "custom", message: "Select fields require at least one option.", path: ["options"] });
  if (field.type !== "select" && field.options.length) ctx.addIssue({ code: "custom", message: "Only select fields can define options.", path: ["options"] });
});

export const createCategorySchema = z.object({
  key: z.string().trim().toLowerCase().min(2).max(48).regex(/^[a-z][a-z0-9_-]*$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().default(""),
  metadataFields: z.array(metadataFieldSchema).max(30).optional().default([])
}).strict().superRefine((value, ctx) => {
  const keys = value.metadataFields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", message: "Metadata field keys must be unique.", path: ["metadataFields"] });
});

const assetObjectSchema = z.object({
  assetCode: z.string().trim().toUpperCase().min(3).max(40).regex(/^[A-Z0-9][A-Z0-9_-]*$/).optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  categoryId: objectId,
  serialNumber: z.string().trim().max(120).optional().default(""),
  manufacturer: z.string().trim().max(120).optional().default(""),
  modelNumber: z.string().trim().max(120).optional().default(""),
  acquisitionDate: z.coerce.date().nullable().optional(),
  warrantyExpiryDate: z.coerce.date().nullable().optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  assignedMembershipId: objectId.nullable().optional(),
  departmentId: objectId.nullable().optional(),
  teamId: objectId.nullable().optional(),
  location: z.object({
    type: z.literal("Point").optional().default("Point"),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  }).strict().nullable().optional(),
  address: z.string().trim().max(300).optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
}).strict();

export const createAssetSchema = assetObjectSchema.superRefine((value, ctx) => {
  if (value.acquisitionDate && value.warrantyExpiryDate && value.warrantyExpiryDate < value.acquisitionDate) {
    ctx.addIssue({ code: "custom", message: "Warranty expiry cannot be before acquisition.", path: ["warrantyExpiryDate"] });
  }
});

export const updateAssetSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  categoryId: objectId.optional(),
  serialNumber: z.string().trim().max(120).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  modelNumber: z.string().trim().max(120).optional(),
  acquisitionDate: z.coerce.date().nullable().optional(),
  warrantyExpiryDate: z.coerce.date().nullable().optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedMembershipId: objectId.nullable().optional(),
  departmentId: objectId.nullable().optional(),
  teamId: objectId.nullable().optional(),
  location: z.object({
    type: z.literal("Point").optional().default("Point"),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
  }).strict().nullable().optional(),
  address: z.string().trim().max(300).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["active", "under_maintenance", "decommissioned", "retired"]).optional()
}).strict().superRefine((value, ctx) => {
  if (value.acquisitionDate && value.warrantyExpiryDate && value.warrantyExpiryDate < value.acquisitionDate) {
    ctx.addIssue({ code: "custom", message: "Warranty expiry cannot be before acquisition.", path: ["warrantyExpiryDate"] });
  }
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const assetDocumentSchema = z.object({
  filename: z.string().trim().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().min(1).max(26214400),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  description: z.string().trim().max(240).optional().default("")
}).strict();

export const assetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  categoryId: objectId.optional(),
  status: z.enum(["active", "under_maintenance", "decommissioned", "retired", "archived"]).optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  departmentId: objectId.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "assetCode", "criticality", "acquisitionDate"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
}).strict();

export const assetIdSchema = objectId;
