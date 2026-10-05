import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { reviewDatabase } from "./review-db-client.mjs";
const db = await reviewDatabase();
const admin = randomUUID(), vendor = randomUUID(), anonymous = randomUUID(), unconfirmed = randomUUID();
async function identity(id, role = "authenticated") {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role })]);
  await db.query(`set local role ${role}`);
}
async function denied(sql, args = []) {
  await db.query("savepoint denied"); let error;
  try { await db.query(sql, args); } catch (cause) { error = cause; }
  await db.query("rollback to savepoint denied"); assert.ok(error, "operation must be denied");
}
try {
  await db.query("begin");
  await db.query("insert into auth.users(id,aud,role,is_anonymous,email_confirmed_at) values($1,'authenticated','authenticated',false,now()),($2,'authenticated','authenticated',false,now()),($3,'authenticated','authenticated',true,null),($4,'authenticated','authenticated',false,null)", [admin, vendor, anonymous, unconfirmed]);
  await db.query("insert into private.admin_users(user_id) values($1),($2),($3)", [admin, anonymous, unconfirmed]);
  await identity(vendor);
  const profile = { name: `Admin test ${randomUUID()}`, category_id: "00000001-0000-4000-8000-000000000001", state_id: "00000003-0000-4000-8000-000000000001", city_id: "00000004-0000-4000-8000-000000000001" };
  const id = (await db.query("select public.create_vendor_business($1) as id", [profile])).rows[0].id;
  assert.equal((await db.query("select public.is_singgah_admin() as allowed")).rows[0].allowed, false);
  await denied("select public.admin_vendor_list()");
  await denied("select public.admin_moderate_vendor($1,'approve','pending','')", [id]);
  await denied("insert into private.admin_users(user_id) values($1)", [vendor]);
  await denied("update public.vendors set status='published' where id=$1", [id]);
  for (const identityId of [anonymous, unconfirmed]) {
    await identity(identityId);
    assert.equal((await db.query("select public.is_singgah_admin() as allowed")).rows[0].allowed, false);
    await denied("select public.admin_vendor_list()");
  }
  await identity(admin);
  const list = (await db.query("select public.admin_vendor_list('pending',$1,1) as result", [profile.name])).rows[0].result;
  assert.equal(list.total, 1); assert.equal(list.vendors[0].id, id);
  await db.query("select public.admin_moderate_vendor($1,'approve','pending','Reviewed')", [id]);
  await denied("select public.admin_moderate_vendor($1,'reject','pending','Stale decision')", [id]);
  await denied("select public.admin_moderate_vendor($1,'reject','published','')", [id]);
  await identity(null, "anon");
  assert.equal((await db.query("select id from public.vendors where id=$1", [id])).rowCount, 1);
  await denied("select public.admin_vendor_list()");
  await identity(admin);
  await db.query("select public.admin_moderate_vendor($1,'reject','published','Incomplete details')", [id]);
  await identity(null, "anon");
  assert.equal((await db.query("select id from public.vendors where id=$1", [id])).rowCount, 0);
  await db.query("reset role");
  assert.equal((await db.query("select count(*)::integer as total from private.vendor_moderation_log where vendor_id=$1", [id])).rows[0].total, 2);
  await db.query("delete from private.admin_users where user_id=$1", [admin]);
  await identity(admin);
  await denied("select public.admin_vendor_list()");
  console.log("PASS: admin membership, privilege boundaries, moderation, stale writes, public visibility and audit; rolled back.");
} finally { await db.query("rollback"); await db.end(); }
