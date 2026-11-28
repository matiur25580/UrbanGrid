import mongoose from "mongoose";
import { Asset } from "../../models/Asset.js";
import { AssetCategory } from "../../models/AssetCategory.js";
import { AssetCounter } from "../../models/AssetCounter.js";
import { Membership } from "../../models/Membership.js";
import { Department } from "../../models/Department.js";
import { Team } from "../../models/Team.js";
import { AuditEvent } from "../../models/AuditEvent.js";

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
function id(value) { return String(value); }
function escapeRegex(value) { return value.replace(/[^a-z0-9 _-]/gi, ""); }

async function audit(req, action, asset, metadata = {}) {
  await AuditEvent.create({
    organizationId: req.auth.organizationId,
    actorUserId: req.auth.userId,
    action,
    entityType: "asset",
    entityId: id(asset._id),
    metadata,
    ipAddress: (req.ip || "").slice(0, 64),
    userAgent: (req.get("user-agent") || "").slice(0, 500)
  });
}

async function validateReferences(organizationId, values) {
  const checks = [];
  if (values.assignedMembershipId) checks.push(Membership.exists({
    _id: values.assignedMembershipId, organizationId, status: "active"
  }).then((result) => { if (!result) throw httpError(400, "ASSET_ASSIGNEE_INVALID", "The assignee must be an active member of this organization."); }));
  if (values.departmentId) checks.push(Department.exists({
    _id: values.departmentId, organizationId, status: "active"
  }).then((result) => { if (!result) throw httpError(400, "ASSET_DEPARTMENT_INVALID", "The department must belong to this organization and be active."); }));
  if (values.teamId) checks.push(Team.exists({
    _id: values.teamId, organizationId, status: "active"
  }).then((result) => { if (!result) throw httpError(400, "ASSET_TEAM_INVALID", "The team must belong to this organization and be active."); }));
  if (values.teamId && values.departmentId) checks.push(Team.exists({
    _id: values.teamId, organizationId, departmentId: values.departmentId
  }).then((result) => { if (!result) throw httpError(400, "ASSET_TEAM_DEPARTMENT_MISMATCH", "The selected team does not belong to the selected department."); }));
  await Promise.all(checks);
}

async function validateMetadata(category, metadata = {}) {
  const fields = category.metadataFields || [];
  const allowed = new Set(fields.map((field) => field.key));
  for (const key of Object.keys(metadata)) {
    if (!allowed.has(key)) throw httpError(400, "ASSET_METADATA_FIELD_UNKNOWN", `The metadata field '${key}' is not defined for this category.`);
  }
  for (const field of fields) {
    const value = metadata[field.key];
    if (value === undefined || value === null || value === "") {
      if (field.required) throw httpError(400, "ASSET_METADATA_REQUIRED", `The metadata field '${field.key}' is required.`);
      continue;
    }
    const valid = field.type === "text" ? typeof value === "string"
      : field.type === "number" ? typeof value === "number" && Number.isFinite(value)
      : field.type === "boolean" ? typeof value === "boolean"
      : field.type === "date" ? typeof value === "string" && !Number.isNaN(Date.parse(value))
      : field.type === "select" ? typeof value === "string" && field.options.includes(value)
      : false;
    if (!valid) throw httpError(400, "ASSET_METADATA_TYPE_INVALID", `The metadata field '${field.key}' has an invalid value.`);
  }
}

async function nextAssetCode(organizationId) {
  const counter = await AssetCounter.findOneAndUpdate(
    { organizationId, scope: "asset" },
    { $inc: { sequence: 1 }, $setOnInsert: { organizationId, scope: "asset" } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `AST-${String(counter.sequence).padStart(6, "0")}`;
}

function serializeAsset(asset) {
  const value = asset.toObject ? asset.toObject() : asset;
  if (value.categoryId && value.categoryId._id) value.category = {
    id: id(value.categoryId._id), key: value.categoryId.key, name: value.categoryId.name
  };
  value.categoryId = value.categoryId?._id ? id(value.categoryId._id) : id(value.categoryId);
  value.id = id(value._id);
  delete value._id;
  delete value.__v;
  if (value.assignedMembershipId?._id) value.assignee = {
    membershipId: id(value.assignedMembershipId._id),
    user: value.assignedMembershipId.userId ? {
      id: id(value.assignedMembershipId.userId._id),
      name: value.assignedMembershipId.userId.name,
      email: value.assignedMembershipId.userId.email
    } : null
  };
  if (value.assignedMembershipId) value.assignedMembershipId = value.assignedMembershipId._id
    ? id(value.assignedMembershipId._id) : id(value.assignedMembershipId);
  return value;
}

export async function listAssetCategories(organizationId) {
  const categories = await AssetCategory.find({ organizationId, status: "active" }).sort({ name: 1 }).lean();
  return categories.map((category) => ({ ...category, id: id(category._id), _id: undefined, __v: undefined }));
}

export async function createAssetCategory(req, input) {
  let category;
  try {
    category = await AssetCategory.create({
      ...input, organizationId: req.auth.organizationId, createdBy: req.auth.userId
    });
  } catch (error) {
    if (error?.code === 11000) throw httpError(409, "ASSET_CATEGORY_EXISTS", "A category with this key already exists in this organization.");
    throw error;
  }
  await AuditEvent.create({
    organizationId: req.auth.organizationId, actorUserId: req.auth.userId,
    action: "asset.category.created", entityType: "asset_category", entityId: id(category._id),
    metadata: { key: category.key, name: category.name },
    ipAddress: (req.ip || "").slice(0, 64),
    userAgent: (req.get("user-agent") || "").slice(0, 500)
  });
  return { ...category.toObject(), id: id(category._id) };
}

export async function createAsset(req, input) {
  const organizationId = req.auth.organizationId;
  const category = await AssetCategory.findOne({ _id: input.categoryId, organizationId, status: "active" });
  if (!category) throw httpError(400, "ASSET_CATEGORY_INVALID", "Choose an active category from this organization.");
  await validateMetadata(category, input.metadata);
  await validateReferences(organizationId, input);
  const assetCode = input.assetCode || await nextAssetCode(organizationId);
  let asset;
  try {
    asset = await Asset.create({
      ...input, assetCode, organizationId, createdBy: req.auth.userId, updatedBy: req.auth.userId
    });
  } catch (error) {
    if (error?.code === 11000) throw httpError(409, "ASSET_IDENTIFIER_EXISTS", "An asset with this identifier already exists in this organization.");
    throw error;
  }
  await audit(req, "asset.created", asset, { assetCode, categoryId: id(category._id), criticality: asset.criticality });
  return serializeAsset(await Asset.findOne({ _id: asset._id, organizationId }).populate("categoryId", "key name").populate({
    path: "assignedMembershipId", select: "userId role", populate: { path: "userId", select: "name email" }
  }).lean());
}

export async function listAssets(organizationId, query) {
  const filter = { organizationId, status: { $ne: "archived" } };
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.status) filter.status = query.status;
  if (query.criticality) filter.criticality = query.criticality;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ name: pattern }, { assetCode: pattern }, { serialNumber: pattern }, { manufacturer: pattern }];
  }
  const sort = { [query.sortBy]: query.sortOrder === "asc" ? 1 : -1, _id: 1 };
  const [assets, total] = await Promise.all([
    Asset.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit)
      .populate("categoryId", "key name").populate({
        path: "assignedMembershipId", select: "userId role", populate: { path: "userId", select: "name email" }
      }).lean(),
    Asset.countDocuments(filter)
  ]);
  return {
    assets: assets.map(serializeAsset),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }
  };
}

export async function getAsset(organizationId, assetId) {
  if (!mongoose.isValidObjectId(assetId)) throw httpError(400, "INVALID_ASSET_ID", "The asset identifier is invalid.");
  const asset = await Asset.findOne({ _id: assetId, organizationId, status: { $ne: "archived" } })
    .populate("categoryId", "key name metadataFields")
    .populate({ path: "assignedMembershipId", select: "userId role", populate: { path: "userId", select: "name email" } })
    .lean();
  if (!asset) throw httpError(404, "ASSET_NOT_FOUND", "The asset was not found.");
  return serializeAsset(asset);
}

const transitions = {
  active: ["under_maintenance", "decommissioned", "retired"],
  under_maintenance: ["active", "decommissioned", "retired"],
  decommissioned: ["retired"],
  retired: [],
  archived: []
};

export async function updateAsset(req, assetId, input) {
  if (!mongoose.isValidObjectId(assetId)) throw httpError(400, "INVALID_ASSET_ID", "The asset identifier is invalid.");
  const asset = await Asset.findOne({ _id: assetId, organizationId: req.auth.organizationId });
  if (!asset || asset.status === "archived") throw httpError(404, "ASSET_NOT_FOUND", "The asset was not found.");
  if (input.status && input.status !== asset.status && !transitions[asset.status]?.includes(input.status)) {
    throw httpError(409, "ASSET_STATUS_TRANSITION_INVALID", `An asset cannot move from '${asset.status}' to '${input.status}'.`);
  }
  const categoryId = input.categoryId || asset.categoryId;
  const category = await AssetCategory.findOne({ _id: categoryId, organizationId: req.auth.organizationId, status: "active" });
  if (!category) throw httpError(400, "ASSET_CATEGORY_INVALID", "Choose an active category from this organization.");
  const metadata = Object.hasOwn(input, "metadata") ? input.metadata : asset.metadata;
  await validateMetadata(category, metadata);
  await validateReferences(req.auth.organizationId, {
    assignedMembershipId: Object.hasOwn(input, "assignedMembershipId") ? input.assignedMembershipId : asset.assignedMembershipId,
    departmentId: Object.hasOwn(input, "departmentId") ? input.departmentId : asset.departmentId,
    teamId: Object.hasOwn(input, "teamId") ? input.teamId : asset.teamId
  });
  const acquisitionDate = Object.hasOwn(input, "acquisitionDate") ? input.acquisitionDate : asset.acquisitionDate;
  const warrantyExpiryDate = Object.hasOwn(input, "warrantyExpiryDate") ? input.warrantyExpiryDate : asset.warrantyExpiryDate;
  if (acquisitionDate && warrantyExpiryDate && warrantyExpiryDate < acquisitionDate) {
    throw httpError(400, "ASSET_DATE_RANGE_INVALID", "Warranty expiry cannot be before acquisition.");
  }
  Object.assign(asset, input, { updatedBy: req.auth.userId });
  await asset.save();
  await audit(req, input.status ? "asset.lifecycle.changed" : "asset.updated", asset, {
    changedFields: Object.keys(input), status: asset.status
  });
  return getAsset(req.auth.organizationId, asset._id);
}

export async function archiveAsset(req, assetId) {
  if (!mongoose.isValidObjectId(assetId)) throw httpError(400, "INVALID_ASSET_ID", "The asset identifier is invalid.");
  const asset = await Asset.findOne({ _id: assetId, organizationId: req.auth.organizationId });
  if (!asset || asset.status === "archived") throw httpError(404, "ASSET_NOT_FOUND", "The asset was not found.");
  asset.status = "archived";
  asset.archivedAt = new Date();
  asset.updatedBy = req.auth.userId;
  await asset.save();
  await audit(req, "asset.archived", asset, { assetCode: asset.assetCode });
  return { id: id(asset._id), assetCode: asset.assetCode, status: asset.status, archivedAt: asset.archivedAt };
}

export async function addAssetDocument(req, assetId, input) {
  if (!mongoose.isValidObjectId(assetId)) throw httpError(400, "INVALID_ASSET_ID", "The asset identifier is invalid.");
  const asset = await Asset.findOne({ _id: assetId, organizationId: req.auth.organizationId, status: { $ne: "archived" } });
  if (!asset) throw httpError(404, "ASSET_NOT_FOUND", "The asset was not found.");
  const document = { ...input, addedBy: req.auth.userId, status: "awaiting_upload", storageProvider: "none" };
  asset.documents.push(document);
  asset.updatedBy = req.auth.userId;
  await asset.save();
  const saved = asset.documents.at(-1);
  await audit(req, "asset.document.metadata_created", asset, { documentId: id(saved._id), filename: saved.filename });
  return {
    id: id(saved._id), filename: saved.filename, mimeType: saved.mimeType,
    sizeBytes: saved.sizeBytes, checksumSha256: saved.checksumSha256 || null,
    description: saved.description, status: saved.status, addedAt: saved.addedAt
  };
}

export async function listAssetDocuments(organizationId, assetId) {
  if (!mongoose.isValidObjectId(assetId)) throw httpError(400, "INVALID_ASSET_ID", "The asset identifier is invalid.");
  const asset = await Asset.findOne({ _id: assetId, organizationId, status: { $ne: "archived" } }).select("documents").lean();
  if (!asset) throw httpError(404, "ASSET_NOT_FOUND", "The asset was not found.");
  return (asset.documents || []).map((document) => ({
    id: id(document._id), filename: document.filename, mimeType: document.mimeType,
    sizeBytes: document.sizeBytes, checksumSha256: document.checksumSha256 || null,
    description: document.description, status: document.status, addedAt: document.addedAt
  }));
}
