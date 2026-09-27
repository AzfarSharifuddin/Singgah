import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Controlled Dev test accounts only. Passwords are random, never printed, and
// accounts are deleted after testing. This does not verify email delivery.
export async function testAccount(db) {
  const id = randomUUID(), email = `singgah-test-${id}@example.com`, password = `${randomUUID()}Aa9!`;
  await db.query("begin");
  try {
  await db.query(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,confirmation_token,recovery_token,email_change,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_anonymous)
    values('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf')),now(),now(),now(),'','','','','{"provider":"email","providers":["email"]}','{}',false)`, [id,email,password]);
  await db.query(`insert into auth.identities(id,user_id,provider_id,provider,identity_data,created_at,updated_at) values($1::uuid,$1::uuid,($1::uuid)::text,'email',jsonb_build_object('sub',($1::uuid)::text,'email',$2::text,'email_verified',true),now(),now())`, [id,email]);
  await db.query("commit");
  } catch(error) { await db.query("rollback"); throw error; }
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const signed = await client.auth.signInWithPassword({ email,password });
  if (signed.error) { await db.query("delete from auth.users where id=$1", [id]); throw new Error(`Test login failed: ${signed.error.code}`); }
  return { id,email,password,client };
}
export async function cleanAccount(db, account) {
  const vendors = (await db.query("select id from public.vendors where owner_user_id=$1", [account.id])).rows.map((row) => row.id);
  if (vendors.length) {
    const objects = (await db.query("select name from storage.objects where bucket_id='vendor-media' and split_part(name,'/',2)=any($1::text[])", [vendors])).rows.map((row) => row.name);
    if (objects.length) { const result = await account.client.storage.from("vendor-media").remove(objects); if (result.error) throw new Error("Storage fixture cleanup failed."); }
  }
  await db.query("begin");
  try {
    await db.query("delete from public.reviews where customer_id=$1 or vendor_id=any($2::uuid[])", [account.id,vendors]);
    await db.query("delete from public.vendor_images where vendor_id=any($1::uuid[])", [vendors]);
    await db.query("delete from public.products where vendor_id=any($1::uuid[])", [vendors]);
    await db.query("delete from public.vendors where owner_user_id=$1", [account.id]);
    await db.query("delete from auth.users where id=$1 and email=$2", [account.id,account.email]);
    await db.query("commit");
  } catch (error) { await db.query("rollback"); throw error; }
}
