import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionWorkOrder, WORK_ORDER_TRANSITIONS } from "./work-order.service.js";

test("work order lifecycle permits only declared transitions", () => {
  for (const [from, destinations] of Object.entries(WORK_ORDER_TRANSITIONS)) {
    for (const to of destinations) assert.equal(canTransitionWorkOrder(from, to), true, `${from} -> ${to}`);
  }
  assert.equal(canTransitionWorkOrder("completed", "in_progress"), false);
  assert.equal(canTransitionWorkOrder("cancelled", "open"), false);
  assert.equal(canTransitionWorkOrder("open", "completed"), false);
  assert.equal(canTransitionWorkOrder("pending_approval", "cancelled"), false);
});
