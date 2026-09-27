import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { reviewDatabase } from "./review-db-client.mjs";

const mode=process.argv[2], file=process.env.TEST_VENDOR_STATE;
if(!file) throw new Error("Set TEST_VENDOR_STATE to a private temporary file outside the repository.");
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const db=await reviewDatabase(); const browser=await chromium.launch({channel:"msedge",headless:true});
const base=process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
try {
  if(mode==="register") {
    const email=process.env.TEST_VENDOR_EMAIL;
    if(!email || existsSync(file))throw new Error("Provide an authorized test email and a new private state filename.");
    if((await db.query("select id from auth.users where lower(email)=lower($1)",[email])).rowCount)throw new Error("This email already has an account. No existing account was changed.");
    const password=`${randomUUID()}Aa9!`;
    const page=await browser.newPage(); await page.goto(`${base}/vendor/register`,{waitUntil:"networkidle"});
    await page.getByLabel("Email",{exact:true}).fill(email); await page.getByLabel("Password",{exact:true}).fill(password);
    await page.getByRole("button",{name:"Create vendor account"}).click();
    const result=page.locator('form p[role="status"],form p[role="alert"]'); await result.waitFor();
    const message=await result.innerText();
    const row=(await db.query("select id,email_confirmed_at from auth.users where email=$1",[email])).rows[0];
    if(row)writeFileSync(file,JSON.stringify({id:row.id,email,password}));
    assert.ok(message.includes("Check your email"),message);
    assert.ok(row,"Registration should create the actual Auth user");
    console.log("PASS: real registration created an unconfirmed account; confirmation email requested. Waiting for the user to open it. Credentials saved privately, not printed.");
  } else if(mode==="verify") {
    const account=JSON.parse(readFileSync(file,"utf8"));
    const row=(await db.query("select email_confirmed_at from auth.users where id=$1 and email=$2",[account.id,account.email])).rows[0];
    assert.ok(row?.email_confirmed_at,"Email is not confirmed yet. No account settings were changed.");
    const page=await browser.newPage(); await page.goto(`${base}/vendor/login`);
    await page.getByLabel("Email",{exact:true}).fill(account.email); await page.getByLabel("Password",{exact:true}).fill(account.password);
    await page.getByRole("button",{name:"Sign in",exact:true}).click(); await page.waitForURL(/\/dashboard\/onboarding$/,{timeout:30000});
    await page.getByRole("heading",{name:"Let’s meet your business."}).waitFor();
    await page.reload({waitUntil:"networkidle"}); assert.match(page.url(),/\/dashboard\/onboarding$/);
    await page.getByRole("button",{name:"Sign out",exact:true}).click(); await page.waitForURL(/\/vendor\/login$/);
    console.log("PASS: real registration, external email confirmation, password login, session persistence, onboarding redirect and logout.");
  } else throw new Error("Expected register or verify.");
} finally { await browser.close(); await db.end(); }
