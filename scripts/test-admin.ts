import assert from "node:assert/strict";
import { test } from "node:test";
import { adminLoginInput, adminPasswordInput, adminRecoveryInput, moderationInput } from "../src/lib/admin/validation.ts";
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

test("admin login requires bounded credentials and a CAPTCHA token", () => {
  const input = adminLoginInput(form({ email: " admin@example.com ", password: "correct horse battery staple", captcha_token: "turnstile-token" }));
  assert.deepEqual(input, { email: "admin@example.com", password: "correct horse battery staple", captchaToken: "turnstile-token" });
  assert.throws(() => adminLoginInput(form({ email: "admin@example.com", password: "password", captcha_token: "" })), /security check/i);
});

test("admin recovery keeps account lookup generic while requiring CAPTCHA", () => {
  assert.deepEqual(adminRecoveryInput(form({ email: " Admin@Example.com ", captcha_token: "turnstile-token" })), { email: "Admin@Example.com", captchaToken: "turnstile-token" });
  assert.equal(adminRecoveryInput(form({ email: "not-an-email", captcha_token: "turnstile-token" })).email, null);
  assert.throws(() => adminRecoveryInput(form({ email: "admin@example.com", captcha_token: "" })), /security check/i);
});

test("admin password setup enforces length and matching confirmation", () => {
  assert.equal(adminPasswordInput(form({ password: "a secure password", confirm_password: "a secure password" })), "a secure password");
  assert.throws(() => adminPasswordInput(form({ password: "short", confirm_password: "short" })), /12 and 128/);
  assert.throws(() => adminPasswordInput(form({ password: "a secure password", confirm_password: "different password" })), /do not match/);
});
