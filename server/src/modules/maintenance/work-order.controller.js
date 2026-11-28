import {
  createWorkOrderSchema, workOrderIdSchema, workOrderListSchema,
  assignWorkOrderSchema, transitionWorkOrderSchema, reviewWorkOrderSchema, checklistItemUpdateSchema
} from "./work-order.schemas.js";
import {
  createWorkOrder, listWorkOrders, getWorkOrder, assignWorkOrder,
  transitionWorkOrder, reviewWorkOrder, updateWorkOrderChecklistItem
} from "./work-order.service.js";

function parse(res, schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({ success: false, error: {
      code: "VALIDATION_ERROR", message: "Please check the supplied information.",
      details: result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
    }});
    return null;
  }
  return result.data;
}
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const list = asyncHandler(async (req, res) => {
  const query = parse(res, workOrderListSchema, req.query);
  if (!query) return;
  res.json({ success: true, data: await listWorkOrders(req.auth.organizationId, query) });
});
export const create = asyncHandler(async (req, res) => {
  const body = parse(res, createWorkOrderSchema, req.body);
  if (!body) return;
  res.status(201).json({ success: true, data: { workOrder: await createWorkOrder(req, body) } });
});
export const getById = asyncHandler(async (req, res) => {
  const id = parse(res, workOrderIdSchema, req.params.workOrderId);
  if (!id) return;
  res.json({ success: true, data: { workOrder: await getWorkOrder(req.auth.organizationId, id) } });
});
export const assign = asyncHandler(async (req, res) => {
  const id = parse(res, workOrderIdSchema, req.params.workOrderId);
  const body = parse(res, assignWorkOrderSchema, req.body);
  if (!id || !body) return;
  res.json({ success: true, data: { workOrder: await assignWorkOrder(req, id, body.membershipId) } });
});
export const transition = asyncHandler(async (req, res) => {
  const id = parse(res, workOrderIdSchema, req.params.workOrderId);
  const body = parse(res, transitionWorkOrderSchema, req.body);
  if (!id || !body) return;
  res.json({ success: true, data: { workOrder: await transitionWorkOrder(req, id, body) } });
});
export const review = asyncHandler(async (req, res) => {
  const id = parse(res, workOrderIdSchema, req.params.workOrderId);
  const body = parse(res, reviewWorkOrderSchema, req.body);
  if (!id || !body) return;
  res.json({ success: true, data: { workOrder: await reviewWorkOrder(req, id, body) } });
});

export const updateChecklistItem = asyncHandler(async (req, res) => {
  const workOrderId = parse(res, workOrderIdSchema, req.params.workOrderId);
  const itemId = parse(res, workOrderIdSchema, req.params.itemId);
  const body = parse(res, checklistItemUpdateSchema, req.body);
  if (!workOrderId || !itemId || !body) return;
  res.json({ success: true, data: { workOrder: await updateWorkOrderChecklistItem(req, workOrderId, itemId, body) } });
});
