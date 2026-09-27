import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { reviewDatabase } from "./review-db-client.mjs";
import { testAccount, cleanAccount } from "./vendor-test-fixtures.mjs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const db=await reviewDatabase(); const browser=await chromium.launch({channel:"msedge",headless:true});
const base=process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const accounts=[]; const customers=[];
const screenshot=process.env.SCREENSHOT_DIR;
if(screenshot)mkdirSync(screenshot,{recursive:true});
const image=await sharp({create:{width:640,height:400,channels:3,background:"#1B3D2E"}}).png().toBuffer();
async function upload(page,section,label) {
  await section.getByLabel("Image file",{exact:true}).setInputFiles({name:"test-photo.png",mimeType:"image/png",buffer:image});
  await section.getByLabel("Image description (optional)").fill(label);
  await section.getByRole("button",{name:"Upload image",exact:true}).click();
  await section.getByRole("status").filter({hasText:"Image uploaded and saved."}).waitFor();
}
try {
  // Email delivery is exercised only by check-vendor-registration.mjs with an
  // explicitly authorized real recipient. This suite never sends email.
  console.log("Using temporary confirmed accounts; email registration is a separate account-level check.");
  for(const width of [375,1280]) {
    const account=await testAccount(db); accounts.push(account);
    if(screenshot)writeFileSync(`${screenshot}/vendor-test-accounts.json`,JSON.stringify(accounts.map(({id,email})=>({id,email}))));
    const context=await browser.newContext({viewport:{width,height:900}}); const page=await context.newPage(); const errors=[];
    page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
    await page.goto(`${base}/dashboard`,{waitUntil:"networkidle"}); assert.match(page.url(),/\/vendor\/login$/);
    const customerClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const customer=await customerClient.auth.signInAnonymously(); assert.equal(customer.error,null);
    customers.push(customer.data.user.id);
    const customerKey=`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    await page.evaluate(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:customerKey,session:customer.data.session});
    await page.getByLabel("Email",{exact:true}).fill(account.email); await page.getByLabel("Password",{exact:true}).fill("Wrong-password-123!");
    await page.getByRole("button",{name:"Sign in",exact:true}).click(); await page.locator('form [role="alert"]').waitFor();
    await page.getByLabel("Password",{exact:true}).fill(account.password); await page.getByRole("button",{name:"Sign in",exact:true}).click();
    await page.waitForURL(/\/dashboard\/onboarding$/);
    await page.getByLabel("Business name",{exact:true}).fill(`Sprint Five Test ${width}`);
    await page.getByLabel("Description (optional)",{exact:true}).fill("A controlled temporary vendor for full dashboard verification.");
    await page.getByLabel("Category",{exact:true}).selectOption({label:"Food & Beverage"});
    await page.getByLabel("Subcategory (optional)",{exact:true}).selectOption({label:"Dessert"});
    await page.getByLabel("State / Federal territory",{exact:true}).selectOption({label:"Johor"});
    await page.getByLabel("City / district",{exact:true}).selectOption({label:"Johor Bahru"});
    await page.getByLabel("Area / locality (optional)",{exact:true}).selectOption({label:"Taman Mount Austin"});
    await page.getByLabel("Phone",{exact:true}).fill("0123456789");
    await page.getByLabel("Website URL",{exact:true}).fill("https://example.com");
    await page.getByRole("button",{name:"Create business & continue"}).click();
    await page.waitForURL(/\/dashboard\/photos/); await page.getByRole("heading",{name:`Sprint Five Test ${width} is set up.`}).waitFor();
    const vendor=(await db.query("select id,slug,status from public.vendors where owner_user_id=$1",[account.id])).rows[0];
    assert.equal(vendor.status,"pending");
    assert.equal((await page.request.get(`${base}/vendor/${vendor.slug}`)).status(),404);
    const photoSection=kind=>page.locator("main section").filter({has:page.getByRole("heading",{name:kind,exact:true})});
    await photoSection("logo").getByLabel("Image file",{exact:true}).setInputFiles({name:"bad.txt",mimeType:"text/plain",buffer:Buffer.from("bad")});
    await photoSection("logo").getByRole("button",{name:"Upload image"}).click(); await photoSection("logo").getByRole("alert").filter({hasText:"Use a JPEG"}).waitFor();
    await photoSection("logo").getByLabel("Image file",{exact:true}).setInputFiles({name:"huge.png",mimeType:"image/png",buffer:Buffer.alloc(3145729)});
    await photoSection("logo").getByRole("button",{name:"Upload image"}).click(); await photoSection("logo").getByRole("alert").filter({hasText:"no larger than 3 MB"}).waitFor();
    await upload(page,photoSection("logo"),"Test logo");
    await upload(page,photoSection("cover"),"Test cover");
    await upload(page,photoSection("gallery"),"Test gallery");
    await upload(page,photoSection("logo"),"Replaced logo");
    assert.equal((await db.query("select name from storage.objects where bucket_id='vendor-media' and name like $1",[`vendors/${vendor.id}/logo/%`])).rowCount,1,"Replacing logo removes old object");
    await page.getByRole("navigation",{name:"Vendor dashboard"}).getByRole("link",{name:"Profile",exact:true}).click();
    await page.getByLabel("Business name",{exact:true}).fill(`Updated Test ${width}`);
    await page.getByRole("button",{name:"Save profile"}).click(); await page.locator('form [role="status"]').waitFor();
    await page.reload({waitUntil:"networkidle"}); assert.equal(await page.getByLabel("Business name",{exact:true}).inputValue(),`Updated Test ${width}`);
    assert.equal((await db.query("select slug from public.vendors where id=$1",[vendor.id])).rows[0].slug,vendor.slug);
    await page.getByRole("navigation",{name:"Vendor dashboard"}).getByRole("link",{name:"Products",exact:true}).click();
    await page.getByRole("link",{name:"Add product",exact:true}).click();
    await page.getByLabel("Product name",{exact:true}).fill("Test Brownie"); await page.getByLabel("Price in MYR (optional)").fill("12.50");
    await page.getByRole("button",{name:"Save product"}).click(); await page.waitForURL(/\/dashboard\/products\?saved=1$/);
    await page.getByRole("link",{name:"Edit product",exact:true}).click();
    await page.getByLabel("Product name",{exact:true}).fill("Updated Brownie"); await page.getByRole("button",{name:"Save product"}).click();
    await page.waitForURL(/\/dashboard\/products\?saved=1$/);
    await page.locator("summary").filter({hasText:"Product image"}).click(); await upload(page,page.locator("main article"),"Test product photo");
    // Platform approval uses scoped administrative tooling, never vendor controls.
    await db.query("update public.vendors set status='published' where id=$1",[vendor.id]);
    await page.goto(`${base}/vendor/${vendor.slug}`,{waitUntil:"networkidle"});
    await page.getByRole("heading",{name:`Updated Test ${width}`,exact:true}).waitFor();
    assert.ok((await page.locator("main").innerText()).includes("Taman Mount Austin"));
    assert.ok((await page.locator("main").innerText()).includes("Updated Brownie"));
    assert.ok(await page.locator('a[href^="tel:"]').count());
    for(const alt of [`Updated Test ${width} logo`,"Test cover","Test gallery","Test product photo"]) {
      const photo=page.getByRole("img",{name:alt,exact:true}); await photo.waitFor();
      await photo.evaluate(element=>element.scrollIntoView());
      await page.waitForFunction(alt=>{const img=[...document.images].find(image=>image.alt===alt);return img?.complete && img.naturalWidth>0},alt);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.goto(`${base}/dashboard`,{waitUntil:"networkidle"});
    assert.equal(await page.getByRole("link",{name:"Open public profile"}).count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(screenshot)await page.screenshot({path:`${screenshot}/dashboard-${width}.png`,fullPage:true});
    await page.goto(`${base}/vendor/aisyah-dessert/review`,{waitUntil:"networkidle"});
    await page.getByRole("heading",{name:"You’re signed in as a vendor."}).waitFor();
    await page.getByRole("link",{name:"Go to dashboard"}).click();
    await page.getByRole("navigation",{name:"Vendor dashboard"}).getByRole("link",{name:"Products",exact:true}).click();
    await page.getByRole("button",{name:"Deactivate product"}).click(); await page.getByText("Inactive · RM 12.50",{exact:true}).waitFor();
    assert.ok((await page.locator("main").innerText()).includes("Inactive"));
    await page.getByRole("button",{name:"Sign out",exact:true}).click(); await page.waitForURL(/\/vendor\/login$/);
    await page.goto(`${base}/dashboard`,{waitUntil:"networkidle"}); assert.match(page.url(),/\/vendor\/login$/);
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).user.id,customerKey),customer.data.user.id);
    assert.deepEqual(errors,[],"No browser errors in vendor flow");
    console.log(`PASS: ${width}px login, onboarding, profile, product create/edit/deactivate, all images, public integration, persistence and logout.`);
    await context.close();
  }
} finally {
  await browser.close();
  for(const account of accounts) await cleanAccount(db,account);
  if(customers.length) await db.query("delete from auth.users where id=any($1::uuid[]) and is_anonymous",[customers]);
  await db.end();console.log("Cleaned up exact vendor browser fixtures and uploaded objects.");
}
