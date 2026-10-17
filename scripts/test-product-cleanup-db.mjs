import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { reviewDatabase } from "./review-db-client.mjs";
const db = await reviewDatabase();
const owner = randomUUID(), other = randomUUID(), anonymous = randomUUID();
let checks = 0;
async function asUser(id, role = "authenticated") {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, role })]);
  await db.query(`set local role ${role}`);
}
async function denied(sql,args=[]) {
  await db.query("savepoint denied"); let error;
  try { await db.query(sql,args); } catch(cause) { error=cause; }
  await db.query("rollback to savepoint denied");assert.equal(error?.code,"42501");checks++;
}
const discard = async id => (await db.query("select public.discard_unfinished_product($1) as removed",[id])).rows[0].removed;
try {
  await db.query("begin");
  await db.query("set local statement_timeout='15s'");
  await db.query("insert into auth.users(id,aud,role,is_anonymous,email_confirmed_at) values($1,'authenticated','authenticated',false,now()),($2,'authenticated','authenticated',false,now()),($3,'authenticated','authenticated',true,null)",[owner,other,anonymous]);
  const profile={name:"Cleanup test",category_id:"00000001-0000-4000-8000-000000000001",state_id:"00000003-0000-4000-8000-000000000001",city_id:"00000004-0000-4000-8000-000000000001"};
  await asUser(other);
  await db.query("select public.create_vendor_business($1)",[profile]);
  await asUser(owner);
  const vendor=(await db.query("select public.create_vendor_business($1) id",[profile])).rows[0].id;
  const ids={};
  for(const kind of ["fresh","active","old","image","rating","object"]){ids[kind]=(await db.query("insert into public.products(vendor_id,name,is_active) values($1,$2,$3) returning id",[vendor,kind,kind==="active"])).rows[0].id;}
  await denied("delete from public.products where id=$1",[ids.fresh]);
  await db.query("reset role");
  await db.query("update public.products set created_at=now()-interval '1 hour' where id=$1",[ids.old]);
  await db.query("insert into public.vendor_images(vendor_id,product_id,storage_path,image_type) values($1,$2,$3,'product')",[vendor,ids.image,`vendors/${vendor}/products/${ids.image}/${randomUUID()}.webp`]);
  const review=(await db.query("insert into public.reviews(vendor_id,rating) values($1,5) returning id",[vendor])).rows[0].id;
  await db.query("insert into public.product_ratings(review_id,product_id,vendor_id,rating) values($1,$2,$3,5)",[review,ids.rating,vendor]);
  await db.query("insert into storage.objects(bucket_id,name) values('vendor-media',$1)",[`vendors/${vendor}/products/${ids.object}/${randomUUID()}.webp`]);
  await asUser(other);assert.equal(await discard(ids.fresh),false);checks++;
  await asUser(anonymous);await denied("select public.discard_unfinished_product($1)",[ids.fresh]);
  await asUser(null,"anon");await denied("select public.discard_unfinished_product($1)",[ids.fresh]);
  await asUser(owner);
  for(const kind of ["active","old","image","rating","object"]){assert.equal(await discard(ids[kind]),false,kind+" must be retained");checks++;}
  assert.equal(await discard(ids.fresh),true);checks++;
  assert.equal(await discard(ids.fresh),false);checks++;
  assert.equal(await discard(randomUUID()),false);checks++;
  await db.query("reset role");
  assert.equal((await db.query("select id from public.products where id=$1",[ids.fresh])).rowCount,0);checks++;
  assert.equal((await db.query("select id from public.products where vendor_id=$1",[vendor])).rowCount,5);checks++;
  console.log(`PASS: ${checks} hosted cleanup checks; all fixture rows rolled back.`);
} finally { await db.query("rollback"); await db.end(); }
