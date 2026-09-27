import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { reviewDatabase } from "./review-db-client.mjs";
const db = await reviewDatabase();
const a = randomUUID(), b = randomUUID(), anonymous = randomUUID(), unconfirmed = randomUUID();
const profile = { name: "Vendor security test", category_id: "00000001-0000-4000-8000-000000000001", state_id: "00000003-0000-4000-8000-000000000001", city_id: "00000004-0000-4000-8000-000000000001" };
let count = 0;
async function identity(id, role = "authenticated") {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role })]);
  await db.query(`set local role ${role}`);
}
async function denied(label, sql, args = [], pattern) {
  await db.query("savepoint forbidden"); let error;
  try { await db.query(sql, args); } catch (cause) { error = cause; }
  await db.query("rollback to savepoint forbidden");
  assert.ok(error, label); if (pattern) assert.match(error.message, pattern);
  count++; console.log(`PASS: ${label}`);
}
try {
  await db.query("begin");
  await db.query("insert into auth.users(id,aud,role,is_anonymous,email_confirmed_at) values($1,'authenticated','authenticated',false,now()),($2,'authenticated','authenticated',false,now()),($3,'authenticated','authenticated',true,null),($4,'authenticated','authenticated',false,null)", [a,b,anonymous,unconfirmed]);
  await identity(anonymous);
  await denied("anonymous cannot onboard", "select public.create_vendor_business($1)", [profile], /confirmed_vendor_account_required/);
  await identity(unconfirmed);
  await denied("unconfirmed account cannot onboard", "select public.create_vendor_business($1)", [profile], /confirmed_vendor_account_required/);
  await identity(a);
  const va = (await db.query("select public.create_vendor_business($1) as id", [profile])).rows[0].id;
  await denied("one business per account", "select public.create_vendor_business($1)", [profile], /business_already_exists/);
  await denied("vendor cannot publish itself", "update public.vendors set status='published' where id=$1", [va], /permission denied/);
  await denied("vendor cannot transfer ownership", "update public.vendors set owner_user_id=$1 where id=$2", [b,va], /permission denied/);
  await denied("vendor cannot change established slug", "update public.vendors set slug='hijacked' where id=$1", [va], /permission denied/);
  await db.query("update public.vendors set name='Updated own business' where id=$1", [va]); count++;
  const pa = (await db.query("insert into public.products(vendor_id,name,price) values($1,'Owned product',2.5) returning id", [va])).rows[0].id;
  await identity(b);
  const vb = (await db.query("select public.create_vendor_business($1) as id", [profile])).rows[0].id;
  assert.equal((await db.query("update public.vendors set name='Intruder' where id=$1 returning id", [va])).rowCount,0); count++;
  await denied("cross-vendor product insert", "insert into public.products(vendor_id,name) values($1,'Intruder')", [va], /row-level security/);
  assert.equal((await db.query("update public.products set name='Intruder' where id=$1 returning id", [pa])).rowCount,0); count++;
  await denied("cannot moderate reviews", "update public.reviews set status='rejected'", [], /permission denied/);
  await db.query("reset role");
  const slugs = (await db.query("select slug from public.vendors where id=any($1::uuid[])", [[va,vb]])).rows.map((row) => row.slug);
  assert.equal(new Set(slugs).size,2); count++;
  const imageId=randomUUID(), path=`vendors/${va}/logo/${randomUUID()}.webp`;
  await db.query("insert into storage.objects(bucket_id,name) values('vendor-media',$1)", [path]);
  await db.query("insert into public.vendor_images(id,vendor_id,storage_path,image_type,is_public) values($1,$2,$3,'logo',true)", [imageId,va,path]);
  await identity(b);
  await denied("direct Storage SQL deletion is protected", "delete from storage.objects where bucket_id='vendor-media' and name=$1", [path], /Direct deletion/);
  await denied("cannot detach another vendor's media", "select public.detach_vendor_image($1)", [imageId], /media_access_denied/);
  await denied("cannot attach another vendor's media", "select public.attach_vendor_image($1,'logo')", [path], /media_access_denied/);
  await identity(anonymous);
  assert.equal((await db.query("update public.vendors set name='Intruder' where id=$1 returning id", [va])).rowCount,0); count++;
  await identity(null,"anon");
  await denied("public cannot change business", "update public.vendors set name='Intruder' where id=$1", [va], /permission denied/);
  assert.equal((await db.query("select id from public.vendors where id=$1", [va])).rowCount,0); count++;
  assert.equal((await db.query("select id from storage.objects where name=$1", [path])).rowCount,0); count++;
  assert.equal((await db.query("select id from public.vendors where slug='aisyah-dessert'")).rowCount,1); count++;
  await db.query("reset role"); await db.query("update public.vendors set status='published' where id=$1", [va]);
  await identity(null,"anon");
  assert.equal((await db.query("select id from storage.objects where name=$1", [path])).rowCount,1); count++;
  console.log(`PASS: ${count} ownership/RLS/slug/media checks; transaction rolled back.`);
} finally { await db.query("rollback"); await db.end(); }
