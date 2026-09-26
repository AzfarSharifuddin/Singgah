import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReview } from "../src/lib/reviews/validation.ts";
import { sameOrigin } from "../src/lib/reviews/origin.ts";
const vendorId = "00000006-0000-4000-8000-000000000001";
const productId = "00000007-0000-4000-8000-000000000001";
const base = { vendorId, rating: 5, text: null, products: [] };
test("same-origin check uses incoming Host despite internal Next hostname normalization", () => {
  const request = (origin: string, host = "127.0.0.1:3002") => new Request("http://localhost:3002/api/reviews", { headers: { origin, host } });
  assert.equal(sameOrigin(request("http://127.0.0.1:3002")), true);
  assert.equal(sameOrigin(request("http://attacker.example")), false);
  assert.equal(sameOrigin(request("null")), false);
  assert.equal(sameOrigin(request("http://127.0.0.1:3002/path")), false);
  assert.equal(sameOrigin(request("https://127.0.0.1:3002")), false);
});
test("review-only, whitespace and optional product ratings", () => {
  assert.equal(parseReview({ ...base, text: "  " }).text, null);
  assert.equal(parseReview({ ...base, text: " nice " }).text, "nice");
  assert.equal(parseReview({ ...base, products: [{ productId, rating: 4 }] }).products.length, 1);
});
test("reject invalid ratings, text, spoofed fields and product comments", () => {
  for (const rating of [0, 6, 2.5, "5", null]) assert.throws(() => parseReview({ ...base, rating }));
  assert.throws(() => parseReview({ ...base, text: "x".repeat(1001) }));
  for (const key of ["customerId", "status", "verification_status"]) assert.throws(() => parseReview({ ...base, [key]: "spoof" }));
  assert.throws(() => parseReview({ ...base, products: [{ productId, rating: 5, text: "forbidden" }] }));
  assert.throws(() => parseReview({ ...base, products: [{ productId, rating: 5 }, { productId, rating: 4 }] }));
});
