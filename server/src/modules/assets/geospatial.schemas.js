import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const sharedFilters = {
  categoryId: objectId.optional(),
  departmentId: objectId.optional(),
  status: z.enum(["active", "under_maintenance", "decommissioned", "retired"]).optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(250)
};

export const assetMapQuerySchema = z.object({
  ...sharedFilters,
  bbox: z.string().trim().min(1).max(100)
}).strict().superRefine((value, ctx) => {
  const bounds = value.bbox.split(",").map(Number);
  if (bounds.length !== 4 || bounds.some((coordinate) => !Number.isFinite(coordinate))) {
    ctx.addIssue({ code: "custom", path: ["bbox"], message: "bbox must be west,south,east,north." });
    return;
  }
  const [west, south, east, north] = bounds;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    ctx.addIssue({ code: "custom", path: ["bbox"], message: "bbox bounds are invalid; use west < east and south < north within longitude/latitude ranges." });
  }
});

export const assetNearbyQuerySchema = z.object({
  ...sharedFilters,
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().int().min(1).max(50000).default(1000)
}).strict();
