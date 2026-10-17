import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { url, key } = getSupabaseConfig();
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const vendors = await client.from("vendors").select("id,name,slug")
  .eq("status", "published").eq("is_active", true).order("name").order("id").range(0, 11);
assert.equal(vendors.error, null);
assert.ok(vendors.data.length, "At least one public vendor is required");
const logos = await client.from("vendor_images").select("vendor_id,storage_path")
  .in("vendor_id", vendors.data.map((vendor) => vendor.id)).eq("image_type", "logo").eq("is_public", true);
assert.equal(logos.error, null);
const logo = logos.data.find((image) => image.storage_path.startsWith(`vendors/${image.vendor_id}/`));
assert.ok(logo, "A public vendor with a real logo is required for image verification");
const vendor = vendors.data.find((vendor) => vendor.id === logo.vendor_id);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/discover?q=${encodeURIComponent(vendor.name)}`, { waitUntil: "networkidle" });
    const card = page.getByRole("link", { name: `View ${vendor.name}`, exact: true });
    const image = card.locator("img");
    await image.waitFor(); await image.evaluate((image) => image.decode());
    const source = new URL(await image.evaluate((image) => image.currentSrc), base);
    assert.equal(source.pathname, "/_next/image");
    assert.ok(Number(source.searchParams.get("w")) <= 128, "logo uses a small responsive thumbnail");
    assert.equal(await image.getAttribute("sizes"), "56px");
    assert.equal(await image.evaluate((image) => getComputedStyle(image).objectFit), "contain", "logos must not be cropped");
    const box = await image.boundingBox();
    assert.equal(box.width, 56); assert.equal(box.height, 56);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (process.env.SCREENSHOT_DIR) await card.screenshot({ path: `${process.env.SCREENSHOT_DIR}/discovery-logo-${width}.png` });
    await card.click();
    await page.waitForURL(base + `/vendor/${vendor.slug}`);
    await page.getByRole("heading", { name: vendor.name, exact: true }).waitFor();
    await page.locator("#reviews").waitFor();
    await page.waitForLoadState("networkidle");
    console.log(`PASS: ${width}px discovery uses a real optimized 56px logo and links to the vendor.`);
  }
  await page.goto(base, { waitUntil: "networkidle" });
  const homeImages = page.locator("main article img");
  assert.ok(await homeImages.count(), "homepage cards also display business logos");
  await homeImages.first().evaluate((image) => image.decode());

  // Simulate a corrupt image response, without changing any hosted files or rows.
  await page.route("**/_next/image?**", async (route) => {
    const original = new URL(route.request().url()).searchParams.get("url");
    if (original && new URL(original).pathname.endsWith(logo.storage_path)) {
      await route.fulfill({ status: 200, contentType: "image/webp", body: Buffer.from("invalid image") });
    } else await route.continue();
  });
  await page.goto(`${base}/discover?q=${encodeURIComponent(vendor.name)}`, { waitUntil: "networkidle" });
  const card = page.getByRole("link", { name: `View ${vendor.name}`, exact: true });
  const initials = vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  await card.locator('span[role="img"]').filter({ hasText: initials }).waitFor();
  assert.equal(await card.locator("img").count(), 0);
  assert.equal(await card.getAttribute("href"), `/vendor/${vendor.slug}`);
  assert.deepEqual(errors, []);
  console.log("PASS: homepage logo, broken-image initials fallback, unchanged profile link and no runtime/console errors. No hosted writes.");
} finally { await browser.close(); }
