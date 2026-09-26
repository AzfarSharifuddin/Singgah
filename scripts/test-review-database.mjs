import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { reviewDatabase } from "./review-db-client.mjs";

const db = await reviewDatabase();
const customer = randomUUID();
const other = randomUUID();
const id = (entity, number) => `${String(entity).padStart(8, "0")}-0000-4000-8000-${String(number).padStart(12, "0")}`;
let checks = 0;
try {
  await db.query("begin");
  await db.query("set local statement_timeout = '15s'");
  const key = (await db.query("select signing_secret from private.review_submission_config where singleton")).rows[0].signing_secret;
  await db.query("insert into auth.users(id, aud, role, is_anonymous) values ($1,'authenticated','authenticated',true),($2,'authenticated','authenticated',true)", [customer, other]);
  const base = { vendorId: id(6, 1), customerId: customer, rating: 5, text: null, products: [], expires: Math.floor(Date.now() / 1000) + 120 };
  const sign = (data) => { const payload = JSON.stringify(data); return [payload, createHmac("sha256", key).update(payload).digest("hex")]; };
  async function asUser(user = customer) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: user, role: "authenticated" })]);
    await db.query("set local role authenticated");
  }
  async function rejected(label, query, values, expected) {
    await db.query("savepoint rejection");
    let error;
    try { await db.query(query, values); } catch (cause) { error = cause; }
    await db.query("rollback to savepoint rejection");
    assert.ok(error, `${label}: should reject`);
    if (expected) assert.match(error.message, expected, label);
    checks++; console.log(`PASS: ${label}`);
  }
  const rpc = "select public.submit_customer_review($1,$2) as id";
  await asUser();
  await rejected("unsigned direct RPC", rpc, [JSON.stringify(base), "0".repeat(64)], /invalid_permit/);
  await rejected("identity spoofing", rpc, sign({ ...base, customerId: other }), /invalid_identity/);
  for (const rating of [0, 6, 1.5, "5"]) await rejected(`invalid rating ${rating}`, rpc, sign({ ...base, rating }), /invalid_rating/);
  await rejected("text length", rpc, sign({ ...base, text: "x".repeat(1001) }), /review_too_long/);
  for (const field of ["status", "verification_status"]) await rejected(`cannot choose ${field}`, rpc, sign({ ...base, [field]: "published" }), /invalid_review/);
  await rejected("expired permit", rpc, sign({ ...base, expires: 1 }), /expired_permit/);
  await rejected("cross-vendor product", rpc, sign({ ...base, products: [{ productId: id(7, 4), rating: 5 }] }), /invalid_product/);
  await rejected("duplicate product", rpc, sign({ ...base, products: [{ productId: id(7, 1), rating: 5 }, { productId: id(7, 1), rating: 4 }] }), /duplicate_product_rating/);
  await rejected("invalid second product rolls back transaction", rpc, sign({ ...base, products: [{ productId: id(7, 1), rating: 5 }, { productId: id(7, 2), rating: 0 }] }), /invalid_product_rating/);
  await rejected("hidden vendor", rpc, sign({ ...base, vendorId: id(6, 6) }), /vendor_unavailable/);
  await rejected("direct table insertion", "insert into public.reviews(vendor_id,customer_id,rating) values($1,$2,5)", [id(6, 1), other], /permission denied/);
  await rejected("cannot read permit key", "select * from private.review_submission_config", [], /permission denied/);
  await db.query("reset role");
  assert.equal(Number((await db.query("select count(*) from public.reviews where customer_id=$1", [customer])).rows[0].count), 0, "failed RPCs leave no parent or child writes");
  checks++;
  await asUser();
  const created = (await db.query(rpc, sign({ ...base, text: "   ", products: [{ productId: id(7, 1), rating: 5 }] }))).rows[0].id;
  assert.equal((await db.query("select public.has_reviewed_vendor($1) as found", [id(6, 1)])).rows[0].found, true);
  await rejected("duplicate customer/vendor", rpc, sign(base), /already_reviewed/);
  await rejected("cannot change moderation", "update public.reviews set status='rejected' where id=$1", [created], /permission denied/);
  await rejected("cannot insert arbitrary product ratings", "insert into public.product_ratings(review_id,product_id,vendor_id,rating) values($1,$2,$3,4)", [created, id(7, 2), id(6, 1)], /permission denied/);
  await asUser(other);
  assert.equal((await db.query("select public.has_reviewed_vendor($1) as found", [id(6, 1)])).rows[0].found, false);
  await db.query("reset role");
  const row = (await db.query("select * from public.reviews where id=$1", [created])).rows[0];
  assert.equal(row.customer_id, customer); assert.equal(row.status, "published"); assert.equal(row.verification_status, "unverified"); assert.equal(row.review_text, null);
  assert.equal(Number((await db.query("select review_count from public.vendor_rating_summaries where vendor_id=$1", [id(6, 1)])).rows[0].review_count), 3);
  assert.equal(Number((await db.query("select rating_count from public.product_rating_summaries where product_id=$1", [id(7, 1)])).rows[0].rating_count), 2);
  checks += 4;
  // Enforce uniqueness independently of the RPC as well.
  await rejected("database unique customer/vendor constraint", "insert into public.reviews(vendor_id,customer_id,rating) values($1,$2,4)", [id(6, 1), customer], /unique constraint/);
  await db.query("insert into public.reviews(vendor_id,customer_id,rating) select id,$1,5 from public.vendors where id=any($2::uuid[])", [customer, [2, 3, 4, 6].map((number) => id(6, number))]);
  await asUser();
  await rejected("per-customer hourly limit", rpc, sign({ ...base, vendorId: id(6, 5) }), /review_rate_limited/);
  await db.query("reset role");
  await db.query("set local role anon");
  await rejected("unauthenticated RPC denied", rpc, sign(base), /permission denied/);
  console.log(`PASS: ${checks} hosted review security/integrity checks. All writes rolled back.`);
} finally { await db.query("rollback"); await db.end(); }
