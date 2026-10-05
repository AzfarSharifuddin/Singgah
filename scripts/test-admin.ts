import assert from "node:assert/strict";
import { test } from "node:test";
import { moderationInput } from "../src/lib/admin/validation.ts";
const valid = { id: "00000000-0000-4000-8000-000000000001", decision: "approve", expected_status: "pending", reason: "" };
function form(values: Record<string, string>) { const result = new FormData(); for (const [key, value] of Object.entries(values)) result.set(key, value); return result; }
test("approve preserves vendor and expected status without taking owner fields", () => {
  assert.deepEqual(moderationInput(form({ ...valid, owner_user_id: "spoof", reason: " reviewed " })), { p_id: valid.id, p_decision: "approve", p_expected_status: "pending", p_reason: "reviewed" });
});
test("reject requires a meaningful bounded reason", () => {
  for (const reason of ["", "  ", "ab", "x".repeat(1001)]) assert.throws(() => moderationInput(form({ ...valid, decision: "reject", reason })));
  assert.equal(moderationInput(form({ ...valid, decision: "reject", reason: "Incomplete business details" })).p_decision, "reject");
});
test("invalid vendor, status and decision cannot become moderation writes", () => {
  for (const values of [{ id: "invalid" }, { expected_status: "archived" }, { expected_status: "draft" }, { decision: "delete" }]) assert.throws(() => moderationInput(form({ ...valid, ...values })));
});
