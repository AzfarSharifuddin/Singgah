import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { reviewDatabase } from "./review-db-client.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const db = await reviewDatabase();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const users = new Set();
const fixtureId = randomUUID();
const fixtureSlug = `review-test-${fixtureId}`;
const fixtureName = "Temporary review test vendor";
const vendorId = "00000006-0000-4000-8000-000000000001";
const productId = "00000007-0000-4000-8000-000000000001";
const manifest = process.env.SCREENSHOT_DIR;
if (manifest) mkdirSync(manifest, { recursive: true });
function record() { if (manifest) writeFileSync(`${manifest}/review-test-cleanup.json`, JSON.stringify({ users: [...users], fixtureId, fixtureSlug })); }
record();
async function identity(page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith("sb-") && name.endsWith("-auth-token"));
    return key ? JSON.parse(localStorage.getItem(key)).user.id : null;
  });
}
async function cleanupUsers() {
  if (!users.size) return;
  await db.query("begin");
  try {
    await db.query("delete from public.reviews where customer_id=any($1::uuid[])", [[...users]]);
    const result = await db.query("delete from auth.users u where u.id=any($1::uuid[]) and u.is_anonymous and not exists(select 1 from public.vendors v where v.owner_user_id=u.id) returning id", [[...users]]);
    assert.equal(result.rowCount, users.size, "Only test anonymous users removed");
    await db.query("commit");
    users.clear(); record();
  } catch (error) { await db.query("rollback"); throw error; }
}

try {
  const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } }).then((response) => response.json());
  const canSubmit = settings.external?.anonymous_users === true;
  await db.query("insert into public.vendors(id,name,slug,category_id,state_id,city_id,status) select $1,$2,$3,category_id,state_id,city_id,'published' from public.vendors where id=$4", [fixtureId, fixtureName, fixtureSlug, vendorId]);
  for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    // Record API-created users immediately, so failures before success are still cleaned up.
    page.on("response", async (response) => {
      if (response.url().includes("/auth/v1/signup") && response.ok()) {
        const result = await response.json();
        if (result.user?.id) { users.add(result.user.id); record(); }
      }
    });
    const response = await page.goto(`${base}/vendor/aisyah-dessert/review`, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.getByRole("button", { name: "Submit Review", exact: true }).waitFor();
    assert.equal(await identity(page), null, "Reading the review page must not create an account");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    const overall = page.getByRole("group", { name: "Overall experience (required)" });
    await overall.getByRole("radio", { name: "1 star", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await overall.getByRole("radio", { name: "2 stars", exact: true }).isChecked(), true);
    assert.ok((await overall.locator("label").first().boundingBox()).height >= 44);
    if (manifest) await page.screenshot({ path: `${manifest}/review-${width}.png`, fullPage: true });
    assert.deepEqual(errors, [], "Review page runtime errors");
    console.log(`PASS: ${width}px real-data review page, keyboard stars, touch targets, no overflow or runtime errors, no eager identity.`);
    for (const slug of ["missing-review-vendor", "draft-demo-stall"]) {
      assert.equal((await page.goto(`${base}/vendor/${slug}/review`)).status(), 404);
    }
    await page.goto(`${base}/vendor/${fixtureSlug}/review`, { waitUntil: "domcontentloaded" });
    assert.equal(await page.getByRole("heading", { name: "What did you try?" }).count(), 0);
    await context.close();
  }
  if (!canSubmit) throw new Error("Browser layout/404/no-products checks passed; live submissions blocked: enable Supabase Anonymous Sign-Ins, then rerun.");

  const initial = (await db.query("select * from public.vendor_rating_summaries where vendor_id=$1", [vendorId])).rows[0];
  const initialProduct = (await db.query("select * from public.product_rating_summaries where product_id=$1", [productId])).rows[0];
  for (const scenario of ["A", "B", "C", "D", "G"]) {
    const context = await browser.newContext({ viewport: { width: scenario === "B" || scenario === "D" ? 1280 : 375, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("response", async (response) => {
      if (response.url().includes("/auth/v1/signup") && response.ok()) {
        const result = await response.json();
        if (result.user?.id) { users.add(result.user.id); record(); }
      }
    });
    const slug = scenario === "G" ? fixtureSlug : "aisyah-dessert";
    await page.goto(`${base}/vendor/${slug}/review`, { waitUntil: "domcontentloaded" });
    const submit = page.getByRole("button", { name: "Submit Review", exact: true });
    await page.waitForFunction(() => !document.querySelector('button[type="submit"],form > button')?.disabled);
    await submit.click();
    await page.getByRole("alert").filter({ hasText: "Choose an overall rating" }).waitFor();
    await page.getByRole("group", { name: "Overall experience (required)" }).locator("label").nth(4).click();
    if (scenario === "B" || scenario === "D") await page.getByLabel("Tell us about your experience").fill("  Sprint 4 controlled browser review.  ");
    if (scenario === "C" || scenario === "D") await page.getByRole("group", { name: "Burnt Cheesecake", exact: true }).locator("label").nth(3).click();
    await submit.click();
    await page.getByRole("alert").filter({ hasText: "agree to the terms" }).waitFor();
    await page.getByRole("checkbox").check();
    const request = page.waitForResponse((response) => response.url() === `${base}/api/reviews`, { timeout: 120000 });
    await submit.click();
    const response = await request;
    assert.equal(response.status(), 201, `Scenario ${scenario}: ${JSON.stringify(await response.json())}`);
    await page.getByRole("heading", { name: "Terima kasih!" }).waitFor();
    const user = await identity(page);
    assert.ok(user); users.add(user); record();
    const rows = (await db.query("select id,rating,review_text,status,verification_status from public.reviews where customer_id=$1", [user])).rows;
    assert.equal(rows.length, 1); assert.equal(rows[0].rating, 5); assert.equal(rows[0].status, "published"); assert.equal(rows[0].verification_status, "unverified");
    assert.equal(rows[0].review_text, scenario === "B" || scenario === "D" ? "Sprint 4 controlled browser review." : null);
    const count = Number((await db.query("select count(*) from public.product_ratings where review_id=$1", [rows[0].id])).rows[0].count);
    assert.equal(count, scenario === "C" || scenario === "D" ? 1 : 0);
    await page.getByRole("link", { name: "Back to vendor" }).click();
    await page.getByRole("heading", { name: scenario === "G" ? fixtureName : "Aisyah Dessert", exact: true }).waitFor();
    if (scenario !== "G") {
      await page.getByText(`${Number(initial.review_count) + 1} published reviews`, { exact: true }).waitFor();
      assert.equal(await page.locator("#reviews").getByText(((Number(initial.average_rating) * Number(initial.review_count) + 5) / (Number(initial.review_count) + 1)).toFixed(1), { exact: true }).count(), 1);
      assert.equal(await page.getByRole("img", { name: `5 stars: ${Number(initial.stars_5) + 1} reviews`, exact: true }).count(), 1);
      assert.equal(await page.getByRole("img", { name: `4 stars: ${initial.stars_4} reviews`, exact: true }).count(), 1);
      assert.equal(Number((await db.query("select average_rating from public.vendor_rating_summaries where vendor_id=$1", [vendorId])).rows[0].average_rating).toFixed(1), ((Number(initial.average_rating) * Number(initial.review_count) + 5) / (Number(initial.review_count) + 1)).toFixed(1));
      const summary = (await db.query("select rating_count from public.product_rating_summaries where product_id=$1", [productId])).rows[0];
      assert.equal(Number(summary.rating_count), count + Number(initialProduct.rating_count));
      const cheesecake = page.locator("#products article").filter({ has: page.getByRole("heading", { name: "Burnt Cheesecake", exact: true }) });
      assert.ok((await cheesecake.innerText()).includes(`${((Number(initialProduct.average_rating) * Number(initialProduct.rating_count) + count * 4) / (Number(initialProduct.rating_count) + count)).toFixed(1)} · ${Number(initialProduct.rating_count) + count} ${Number(initialProduct.rating_count) + count === 1 ? "rating" : "ratings"}`), "Product average and count update in the rendered profile");
    }
    assert.equal(await identity(page), user, "Identity persists on vendor navigation");
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.equal(await identity(page), user, "Identity persists on reload");
    await page.getByRole("link", { name: "Leave a Review" }).click();
    await page.getByRole("heading", { name: "You’ve already reviewed this vendor." }).waitFor();
    assert.equal(await identity(page), user);
    assert.deepEqual(errors, [], "Submission runtime errors");
    console.log(`PASS: Scenario ${scenario}, publication and aggregates, duplicate state, identity persistence.`);
    await context.close();
    await cleanupUsers();
  }
} finally {
  await browser.close();
  await cleanupUsers();
  await db.query("delete from public.vendors where id=$1 and slug=$2", [fixtureId, fixtureSlug]);
  await db.end();
  console.log("Cleaned up scoped browser-test users, reviews and temporary vendor.");
}
