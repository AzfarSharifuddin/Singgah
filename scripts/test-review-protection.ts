import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { reviewProtection, reviewPermit, verifyTurnstile } from "../src/lib/reviews/protection.ts";

test("production fails closed with missing config and official dummy keys", () => {
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production", TURNSTILE_TEST_MODE: "true", REVIEW_SUBMISSION_SECRET: "a".repeat(64) });
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(reviewProtection(), null);
    Object.assign(process.env, { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA", TURNSTILE_ALLOWED_HOSTNAMES: "localhost" });
    assert.equal(reviewProtection(), null);
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.VERCEL;
    assert.equal(reviewProtection()?.test, true);
    process.env.VERCEL = "1";
    assert.equal(reviewProtection(), null);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("Siteverify rejects failure, wrong action and wrong hostname", async () => {
  const original = globalThis.fetch;
  const config = { test: false, secret: "test-fixture", siteKey: "test-fixture", signingSecret: "a".repeat(64), hosts: ["singgah.example"] };
  try {
    for (const [response, expected] of [
      [{ success: false }, false],
      [{ success: true, action: "signup", hostname: "singgah.example" }, false],
      [{ success: true, action: "review", hostname: "attacker.example" }, false],
      [{ success: true, action: "review", hostname: "singgah.example" }, true],
    ] as const) {
      globalThis.fetch = async () => Response.json(response);
      assert.equal(await verifyTurnstile("fixture-token", config), expected);
    }
  } finally { globalThis.fetch = original; }
});

test("permit covers exact review data and authenticated identity with short expiry", () => {
  const secret = "b".repeat(64);
  const review = { vendorId: "vendor-fixture", termsAccepted: true as const, rating: 5, text: null, products: [] };
  const permit = reviewPermit(review, "customer-fixture", secret);
  const payload = JSON.parse(permit.payload);
  assert.equal(payload.customerId, "customer-fixture");
  assert.equal(payload.vendorId, review.vendorId);
  assert.ok(payload.expires >= Date.now() / 1000 + 118 && payload.expires <= Date.now() / 1000 + 121);
  assert.equal(permit.signature, createHmac("sha256", secret).update(permit.payload).digest("hex"));
  assert.notEqual(permit.signature, createHmac("sha256", secret).update(permit.payload.replace('"rating":5', '"rating":1')).digest("hex"));
});
