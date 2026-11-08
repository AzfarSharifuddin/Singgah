import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

// Public, read-only smoke test against the current dataset, not the old seed names.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { url, key } = getSupabaseConfig();
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const [categories, vendors, states] = await Promise.all([
  client.from("categories").select("id,name,slug").order("display_order").order("id"),
  client.from("vendors").select("name,slug").eq("status", "published").eq("is_active", true).order("created_at", { ascending: false }).order("id").limit(3),
  client.from("states").select("name,slug").order("name").order("id"),
]);
assert.equal(categories.error, null);
assert.equal(vendors.error, null);
assert.equal(states.error, null);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
if (process.env.SCREENSHOT_DIR) mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`${message.text()} (${new URL(message.location().url || page.url()).pathname})`); });
  const visit = async (path) => {
    const response = await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200, path);
  };
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await visit("/");
    assert.equal(await page.locator("h1").textContent(), "Stories MakePlaces Brighter.");
    assert.equal(await page.locator("main section").count(), 6);
    assert.equal(await page.locator("main input").count(), 0);
    assert.equal(await page.locator("main select").count(), 1);
    assert.equal(await page.locator("main form").count(), 1);
    assert.match(await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily), /Arial/);
    await page.evaluate(() => document.fonts.ready);
    const font = await page.locator("h1").evaluate((el) => ({ family: getComputedStyle(el).fontFamily, loaded: [...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replace(/["']/g, "")) }));
    assert.ok(font.loaded.some((family) => !family.includes("Fallback") && font.family.includes(family)), "headline uses a loaded local web font");
    console.log(`FONT: ${width}px ${font.family}`);
    assert.match(await page.locator("header").getByRole("link", { name: "Singgah home" }).evaluate((el) => getComputedStyle(el).fontFamily), /Arial/, "existing wordmark stays unchanged");
    assert.match(await page.locator("header nav").evaluate((el) => getComputedStyle(el).fontFamily), /Courier/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const explore = page.getByRole("link", { name: "Explore Singgah", exact: true });
    const box = await explore.boundingBox();
    assert.ok(box.height >= 44 && box.y + box.height < 900, "primary action is touch-sized and visible in the first screen");
    const opening = page.locator(".home-opening");
    const heroBox = await opening.boundingBox();
    const titleBox = await page.locator("h1").boundingBox();
    assert.equal(await opening.locator("p, .home-opening-shade").count(), 0, "hero has no supporting copy or white overlay");
    assert.ok(titleBox.x <= 40 && titleBox.y > heroBox.y + heroBox.height / 2, "title is at the bottom left");
    assert.ok(width - box.x - box.width <= 40, "Explore stays at the right edge");
    if (width >= 640) assert.ok(Math.abs(titleBox.y + titleBox.height - box.y - box.height) < 2, "desktop title and action share a bottom baseline");
    const photo = page.locator(".home-opening-photo");
    await photo.evaluate((image) => image.decode());
    const source = new URL(await photo.evaluate((image) => image.currentSrc), base);
    assert.equal(source.pathname, "/_next/image");
    assert.equal(source.searchParams.get("url"), "/images/home/kampung.webp");
    assert.ok(await photo.getAttribute("srcset"));
    const imageResponse = await page.request.get(source.href);
    assert.equal(imageResponse.status(), 200);
    console.log(`IMAGE: ${width}px hero ${(await imageResponse.body()).length} bytes, decoded.`);
    const strip = page.getByRole("list", { name: "Vendor categories", exact: true });
    const links = strip.getByRole("link");
    assert.equal(await links.count(), categories.data.length);
    for (let index = 0; index < categories.data.length; index++) {
      assert.equal(await links.nth(index).textContent(), categories.data[index].name);
      assert.equal(await links.nth(index).getAttribute("href"), `/discover?category=${categories.data[index].slug}`);
    }
    if (width < 1024 && categories.data.length > 2) {
      assert.ok(await strip.evaluate((el) => el.scrollWidth > el.clientWidth), "small screens use a contained native strip");
      await links.last().focus();
      await page.waitForFunction(() => document.querySelector(".home-categories").scrollLeft > 0);
      await links.last().locator("img").evaluate((image) => image.decode());
      assert.ok((await links.last().boundingBox()).x < width, "keyboard focus reveals the last category");
      await links.first().focus();
    }
    assert.deepEqual(await page.locator("main article h3").allTextContents(), vendors.data.map((vendor) => vendor.name));
    const destination = page.getByRole("form", { name: "Explore by destination" });
    assert.deepEqual(await destination.locator("option").evaluateAll((options) => options.slice(1).map((option) => option.value)), states.data.map((state) => state.slug));
    if (states.data.length) {
      await destination.getByLabel("State / Federal territory", { exact: true }).selectOption(states.data[0].slug);
      await destination.getByRole("button", { name: "Explore vendors", exact: true }).click();
      await page.waitForURL((value) => value.pathname === "/discover" && value.searchParams.get("state") === states.data[0].slug);
      await visit("/");
    }
    assert.equal(await page.getByRole("link", { name: "Join Singgah", exact: true }).getAttribute("href"), "/vendor/register");
    if (process.env.SCREENSHOT_DIR) {
      // Full-page screenshots do not trigger below-fold lazy images by themselves.
      for (const image of await page.locator('section[aria-labelledby="latest-heading"] img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((element) => element.decode());
      }
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/home-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/opening-${width}.png` });
    }
    await explore.focus();
    await explore.press("Enter");
    await page.waitForURL(base + "/discover");
    await page.waitForLoadState("networkidle");
    const search = page.getByLabel("Search vendors", { exact: true });
    await search.waitFor({ state: "visible" });
    assert.equal(await search.isVisible(), true);
    if (width < 1024) await page.getByRole("button", { name: "Filters & sorting +", exact: true }).click();
    await page.getByLabel("State / Federal territory", { exact: true }).waitFor({ state: "visible" });
    assert.equal(await page.getByLabel("State / Federal territory", { exact: true }).isVisible(), true);
    if (vendors.data.length) {
      await search.fill(vendors.data[0].name);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page.waitForURL((value) => value.searchParams.get("q") === vendors.data[0].name);
      await page.waitForLoadState("networkidle");
      await page.getByRole("link", { name: `View ${vendors.data[0].name}`, exact: true }).click();
      await page.waitForURL(base + `/vendor/${vendors.data[0].slug}`);
      await page.getByRole("heading", { name: vendors.data[0].name, exact: true }).waitFor();
    }
    if (categories.data.length) {
      await visit("/");
      await page.getByRole("list", { name: "Vendor categories" }).getByRole("link").first().click();
      await page.waitForURL((value) => value.searchParams.get("category") === categories.data[0].slug);
    }
    console.log(`PASS: ${width}px six-section homepage, local font/wordmark, images, keyboard/touch navigation, real categories/vendors, destination selector, discovery and vendor profile.`);
  }
  for (const path of ["/faq", "/terms", "/vendor/register"]) await visit(path);
  assert.deepEqual(errors, [], "No browser runtime or console errors");
} finally {
  await browser.close();
}
