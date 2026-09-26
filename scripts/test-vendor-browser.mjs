import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Uses an existing Playwright runtime; no browser downloads or app dependencies.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${base}/vendor/aisyah-dessert`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { name: "Aisyah Dessert", exact: true }).waitFor();
    const body = await page.locator("main").textContent();
    for (const value of ["Food & Beverage", "Dessert", "Taman Mount Austin", "Johor Bahru", "Burnt Cheesecake", "Tiramisu Cup", "Matcha Brownie", "Lovely sample dessert selection.", "4.5", "2 published reviews", "No gallery photos yet.", "Price not listed", "No ratings yet"]) assert.ok(body.includes(value), `Missing ${value}`);
    assert.ok(!body.includes("Pending fixture"));
    assert.equal(await page.getByRole("button", { name: "Leave a Review" }).isDisabled(), true);
    assert.equal(await page.locator('a[href^="tel:"],a[href*="wa.me"]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    assert.match(await page.title(), /Aisyah Dessert — Taman Mount Austin \| Singgah/);
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /index, follow/);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok((await page.locator("h1").boundingBox()).width >= 220, "Vendor heading must not be squeezed by the rating badge");
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Reviews" }).click();
    assert.match(page.url(), /#reviews$/);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/vendor-${width}.png`, fullPage: true });
    console.log(`PASS: real Aisyah Dessert profile at ${width}px.`);
  }
  await page.goto(`${base}/vendor/luna-hijab`, { waitUntil: "networkidle" });
  assert.ok((await page.locator("body").innerText()).includes("Anonymous"));
  await page.goto(`${base}/vendor/bunga-kertas-studio`, { waitUntil: "networkidle" });
  assert.ok((await page.locator("body").innerText()).includes("No reviews yet."));
  for (const slug of ["this-vendor-does-not-exist", "draft-demo-stall"]) {
    const response = await page.goto(`${base}/vendor/${slug}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 404, `${slug}: HTTP status`);
    assert.equal(await page.getByRole("heading", { name: "This place isn’t here." }).count(), 1);
    assert.ok(!(await page.locator("body").innerText()).includes("Fictional development fixture"));
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log("PASS: anonymous reviewer, no-review state, missing/draft 404s, no browser runtime errors.");
} finally { await browser.close(); }
