import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${message.text()} (${message.location().url})`); });
  const visit = async (path) => { await page.goto(base + path, { waitUntil: "networkidle" }); };
  const count = async (expected) => {
    await page.waitForFunction((value) => document.querySelectorAll('[data-testid="vendor-results"] article').length === value, expected);
    assert.equal(await page.locator('[data-testid="vendor-results"] article').count(), expected);
  };
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await visit("/");
    await page.getByRole("heading", { name: "Stories Make Places Brighter." }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Food & Beverage", exact: true }).count(), 1);
    await noOverflow();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/home-${width}.png`, fullPage: true });
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /index, follow/);
    await page.getByLabel("Search vendors", { exact: true }).fill("Aisyah");
    await page.getByRole("button", { name: "Explore Singgah" }).click();
    await page.waitForURL(/q=Aisyah/); await count(1);
    await visit("/discover"); await count(5); await noOverflow();
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex, follow/);
    assert.ok(!(await page.locator("main").textContent()).includes("Draft Demo Stall"));
    if (width === 375) {
      assert.equal(await page.getByLabel("Category", { exact: true }).isVisible(), false);
      await page.getByRole("button", { name: "Filters & sorting +" }).click();
    }
    await page.getByLabel("Category", { exact: true }).selectOption("food-beverage");
    await page.getByLabel("Subcategory", { exact: true }).selectOption("dessert");
    await page.getByLabel("State / Federal territory", { exact: true }).selectOption("johor");
    await page.getByLabel("City / District", { exact: true }).selectOption("johor-bahru");
    await page.getByLabel("Area / Locality", { exact: true }).selectOption("taman-mount-austin");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await page.waitForURL(/area=taman-mount-austin/); await page.waitForLoadState("networkidle"); await count(1);
    assert.equal(new URL(page.url()).searchParams.get("subcategory"), "dessert");
    await noOverflow();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/discover-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "View Aisyah Dessert" }).click();
    await page.waitForURL(base + "/vendor/aisyah-dessert");
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: "Aisyah Dessert", exact: true }).waitFor();
    await page.goBack({ waitUntil: "networkidle" }); await count(1);
    await page.getByRole("link", { name: "Clear filters", exact: true }).last().click();
    await page.waitForURL(base + "/discover"); await page.waitForLoadState("networkidle"); await count(5);
    await page.goBack({ waitUntil: "networkidle" }); await count(1);
    await page.goForward({ waitUntil: "networkidle" }); await count(5);
    console.log(`PASS: ${width}px homepage, cascading filters, URL state, profile link, back/forward and clear.`);
  }
  for (const [query, expected] of [
    ["q=%20AISYAH%20", 1], ["q=Fictional+development", 5], ["category=food-beverage", 3],
    ["category=food-beverage&subcategory=dessert", 1], ["state=selangor", 1],
    ["state=selangor&city=shah-alam", 1], ["state=johor&city=johor-bahru&area=taman-mount-austin", 1],
    ["category=fashion-attire&state=selangor&city=shah-alam", 1],
    ["q=nonexistent&state=johor", 0], ["category=fashion-attire&state=johor", 0],
    ["q=%25", 0], ["category=invalid&state=bogus&page=-5", 5], ["page=999999", 5], ["sort=newest", 5],
  ]) { await visit(`/discover?${query}`); await count(expected); if (!expected) await page.getByRole("heading", { name: "No vendors found", exact: true }).waitFor(); }
  await visit("/discover");
  assert.deepEqual(await page.locator('[data-testid="vendor-results"] h3').allTextContents(), ["Aisyah Dessert", "Bunga Kertas Studio", "Kopi Senja Demo", "Luna Hijab", "Warung Pak Din"]);
  await visit("/discover?sort=newest");
  assert.deepEqual(await page.locator('[data-testid="vendor-results"] h3').allTextContents(), ["Aisyah Dessert", "Warung Pak Din", "Luna Hijab", "Bunga Kertas Studio", "Kopi Senja Demo"]);
  await visit("/discover?category=food-beverage&subcategory=dessert&state=johor&city=johor-bahru&area=taman-mount-austin");
  await page.getByLabel("Category", { exact: true }).selectOption("fashion-attire");
  assert.equal(await page.getByLabel("Subcategory", { exact: true }).inputValue(), "");
  await page.getByLabel("State / Federal territory", { exact: true }).selectOption("selangor");
  assert.equal(await page.getByLabel("City / District", { exact: true }).inputValue(), "");
  assert.equal(await page.getByLabel("Area / Locality", { exact: true }).inputValue(), "");
  assert.deepEqual(errors, []);
  console.log("PASS: all individual/combined filters, literal search, empty states, invalid URLs, excessive page, sort and child resets. No console/runtime errors.");
} finally { await browser.close(); }
