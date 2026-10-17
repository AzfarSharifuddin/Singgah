import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

// Read-only regression checks against the current public dataset, rather than
// assuming the original five fictional vendors are still published.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { url, key } = getSupabaseConfig();
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const read = async (query) => {
  const result = await query;
  assert.equal(result.error, null);
  return result;
};
const vendorQuery = () => client.from("vendors").select("id,name,slug,category_id,subcategory_id,state_id,city_id,area_id", { count: "exact" }).eq("status", "published").eq("is_active", true);
const latest = await read(vendorQuery().order("created_at", { ascending: false }).order("id").limit(3));
assert.ok(latest.data.length, "At least one approved public vendor is required");
const vendor = latest.data[0];
const [categories, subcategories, states, cities, areas] = await Promise.all([
  "categories", "subcategories", "states", "cities", "areas",
].map(async (table) => (await read(client.from(table).select("*"))).data));
const slug = (rows, id) => rows.find((row) => row.id === id)?.slug;
const filterParams = new URLSearchParams({
  category: slug(categories, vendor.category_id), state: slug(states, vendor.state_id), city: slug(cities, vendor.city_id),
});
if (vendor.subcategory_id) filterParams.set("subcategory", slug(subcategories, vendor.subcategory_id));
if (vendor.area_id) filterParams.set("area", slug(areas, vendor.area_id));
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const visit = async (path) => {
    const response = await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, path);
  };
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const resultNames = () => page.locator('[data-testid="vendor-results"] h3').allTextContents();
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await visit("/");
    assert.deepEqual(await page.locator("main article h3").allTextContents(), latest.data.map((row) => row.name));
    await noOverflow();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/home-${width}.png`, fullPage: true });
    await page.getByLabel("Search vendors", { exact: true }).fill(vendor.name);
    await page.getByRole("button", { name: "Explore Singgah" }).click();
    await page.waitForURL((value) => value.searchParams.get("q") === vendor.name);
    await page.waitForLoadState("networkidle");
    assert.ok((await resultNames()).includes(vendor.name));
    await visit(`/discover?${filterParams}`);
    assert.ok((await resultNames()).includes(vendor.name));
    await noOverflow();
    if (width === 375) {
      assert.equal(await page.getByLabel("Category", { exact: true }).isVisible(), false);
      await page.getByRole("button", { name: "Filters & sorting +" }).click();
    }
    assert.equal(await page.getByLabel("Category", { exact: true }).inputValue(), filterParams.get("category"));
    assert.equal(await page.getByLabel("State / Federal territory", { exact: true }).inputValue(), filterParams.get("state"));
    assert.equal(await page.getByLabel("City / District", { exact: true }).inputValue(), filterParams.get("city"));
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/discovery-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: `View ${vendor.name}`, exact: true }).click();
    await page.waitForURL(base + `/vendor/${vendor.slug}`);
    await page.getByRole("heading", { name: vendor.name, exact: true }).waitFor();
    await page.waitForLoadState("networkidle");
    const summary = (await read(client.from("vendor_rating_summaries").select("review_count,average_rating").eq("vendor_id", vendor.id).single())).data;
    assert.ok((await page.locator("#reviews").textContent()).includes(`${summary.review_count} published`));
    const products = (await read(client.from("products").select("id,name").eq("vendor_id", vendor.id).eq("is_active", true))).data;
    assert.equal(await page.locator("#products article").count(), products.length);
    for (const product of products) assert.ok((await page.locator("#products").textContent()).includes(product.name));
    const images = page.locator("main img");
    if (await images.count()) {
      const source = new URL(await images.first().evaluate((image) => image.currentSrc || image.src), base);
      assert.equal(source.pathname, "/_next/image", `responsive Next image optimizer remains enabled (${source.pathname})`);
      assert.ok(await images.first().getAttribute("srcset"));
      assert.ok(await images.first().getAttribute("sizes"));
      const optimized = await page.request.get(source.href);
      assert.equal(optimized.status(), 200, "optimized public image can be fetched");
      assert.match(optimized.headers()["content-type"], /^image\//);
      await images.first().evaluate((image) => image.decode());
      console.log(`IMAGE: ${width}px first image, ${Number(optimized.headers()["content-length"]) || (await optimized.body()).length} optimized bytes; decoded successfully.`);
    }
    await noOverflow();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/profile-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Leave a Review", exact: true }).first().click();
    await page.waitForURL(base + `/vendor/${vendor.slug}/review`);
    await page.getByRole("heading", { name: "How was your experience?" }).waitFor();
    await noOverflow();
    await page.goBack({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: vendor.name, exact: true }).waitFor();
    console.log(`PASS: ${width}px homepage, search, cascading filters, profile/products/ratings, responsive images, review route and browser back.`);
  }
  for (const sort of ["highest", "lowest", "newest"]) {
    await visit(`/vendor/${vendor.slug}?reviewSort=${sort}#reviews`);
    let query = client.from("reviews").select("reviewer_name").eq("vendor_id", vendor.id).eq("status", "published");
    if (sort !== "newest") query = query.order("rating", { ascending: sort === "lowest" });
    const reviews = (await read(query.order("created_at", { ascending: false }).order("id").range(0, 9))).data;
    assert.deepEqual(await page.locator("#reviews article h3").allTextContents(), reviews.map((row) => row.reviewer_name?.trim() || "Name not recorded"));
  }
  await visit("/discover?q=performance-no-results-6bbadf");
  await page.getByRole("heading", { name: "No vendors found", exact: true }).waitFor();
  await page.getByRole("link", { name: "Clear filters", exact: true }).first().click();
  await page.waitForURL(base + "/discover");
  await page.waitForLoadState("networkidle");
  const expected = await read(vendorQuery().order("name").order("id").range(0, 11));
  assert.deepEqual(await resultNames(), expected.data.map((row) => row.name));
  await visit("/discover?category=invalid&state=invalid&page=999999");
  assert.equal(new URL(page.url()).searchParams.get("category"), null);
  assert.equal(new URL(page.url()).searchParams.get("page"), expected.count > 12 ? String(Math.ceil(expected.count / 12)) : null);
  const notFound = await page.goto(base + "/vendor/performance-nonexistent-6bbadf", { waitUntil: "networkidle" });
  assert.equal(notFound.status(), 404);
  // 404 resource diagnostics are expected; actual JS/runtime exceptions are not.
  const unexpected = errors.filter((error) => !/Failed to load resource: the server responded with a status of 404/.test(error));
  assert.deepEqual(unexpected, []);
  await visit("/dashboard");
  assert.equal(new URL(page.url()).pathname, "/vendor/login");
  console.log("PASS: review sorting, empty results, clear filters, invalid filter/page recovery, 404 and protected dashboard redirect. No runtime errors.");
} finally { await browser.close(); }
