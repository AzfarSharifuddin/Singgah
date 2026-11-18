import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

// Read-only UI checks: no CAPTCHA automation, signup or review writes.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { url, key } = getSupabaseConfig();
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: vendor, error } = await client.from("vendors").select("id,name,slug")
  .eq("status", "published").eq("is_active", true).order("created_at", { ascending: false }).order("id").limit(1).single();
assert.equal(error, null);
const products = await client.from("products").select("id,name").eq("vendor_id", vendor.id).eq("is_active", true).order("display_order").order("id");
assert.equal(products.error, null);
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "chrome", headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const path = `/vendor/${vendor.slug}/review`;
if (process.env.SCREENSHOT_DIR) mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
try {
  for (const width of [320, 375, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    const writes = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const target = new URL(request.url());
      if (request.method() === "POST" && (target.pathname === "/api/reviews" || target.pathname.startsWith("/auth/v1/"))) writes.push(target.pathname);
    });
    // The existing Turnstile iframe can keep background requests active. Form
    // readiness, not provider network idleness, determines whether UI is usable.
    const response = await page.goto(base + path, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { name: "How was your experience?", exact: true }).waitFor();
    assert.equal(await page.getByRole("banner").getByRole("link").count(), 0, "review header has no navigation or home link");
    const footer = page.getByRole("contentinfo");
    assert.equal(await footer.getByRole("link").count(), 0);
    assert.ok((await footer.boundingBox()).height <= 60, "review footer stays compact on mobile and desktop");
    const name = page.getByRole("textbox", { name: "Your name", exact: true });
    await name.waitFor();
    // SSR inputs exist before React attaches their handlers. Wait for that
    // attachment instead of depending on the independent CAPTCHA lifecycle.
    await page.waitForFunction(() => {
      const input = document.getElementById("reviewer-name");
      return input && Object.keys(input).some((key) => key.startsWith("__reactProps"));
    });
    assert.equal(await name.getAttribute("maxlength"), "20");
    await name.fill("A".repeat(30));
    assert.equal((await name.inputValue()).length, 20, "input/paste is capped at 20 characters");
    await name.fill("Nur Aisyah");
    const overall = page.getByRole("group", { name: "Overall experience (required)", exact: true });
    await overall.getByRole("radio", { name: "4 stars", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await overall.getByRole("radio", { name: "5 stars", exact: true }).isChecked(), true);
    assert.ok((await overall.locator("label").first().boundingBox()).height >= 44);
    await page.getByRole("textbox", { name: "Your experience (optional)", exact: true }).fill("Lovely dessert.");
    await page.waitForFunction(() => document.getElementById("text-limit")?.textContent.includes("15 / 1000"));
    const details = page.locator("details.review-products");
    if (products.data.length) {
      assert.equal(await details.getAttribute("open"), null);
      assert.equal(await details.getByRole("checkbox").count(), 0, "optional product controls start collapsed");
      await details.locator("summary").click();
      assert.equal(await details.getByRole("checkbox").count(), products.data.length);
      const choice = details.getByRole("checkbox", { name: products.data[0].name, exact: true });
      await choice.check();
      let stars = details.getByRole("group", { name: products.data[0].name, exact: true });
      await stars.getByRole("radio", { name: "4 stars", exact: true }).focus();
      await page.keyboard.press("Space");
      assert.equal(await stars.getByRole("radio", { name: "4 stars", exact: true }).isChecked(), true);
      await details.getByRole("button", { name: `Remove rating for ${products.data[0].name}`, exact: true }).click();
      assert.equal(await choice.isChecked(), false);
      await choice.check();
      stars = details.getByRole("group", { name: products.data[0].name, exact: true });
      await stars.getByRole("radio", { name: "4 stars", exact: true }).focus();
      await page.keyboard.press("Space");
      await details.locator("summary").click();
    }
    await page.locator("#review-terms").check();
    await page.getByRole("link", { name: "terms and conditions", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/terms" && url.searchParams.get("review") === vendor.slug);
    await page.locator(`a[href="${path}"]`).first().click();
    await page.waitForURL(base + path);
    await page.waitForFunction(() => document.getElementById("reviewer-name")?.value === "Nur Aisyah");
    assert.equal(await page.locator("#review-terms").isChecked(), false, "consent remains deliberate after Terms");
    assert.equal(await overall.getByRole("radio", { name: "5 stars", exact: true }).isChecked(), true);
    assert.equal(await page.locator("#experience").inputValue(), "Lovely dessert.");
    if (products.data.length) {
      await details.locator("summary").click();
      assert.equal(await details.getByRole("checkbox", { name: products.data[0].name, exact: true }).isChecked(), true);
      assert.equal(await details.getByRole("group", { name: products.data[0].name, exact: true }).getByRole("radio", { name: "4 stars", exact: true }).isChecked(), true);
      await details.locator("summary").click();
    }
    await page.evaluate(() => document.fonts.ready);
    // Terms-return navigation obtains fresh signed media URLs; wait for their
    // actual image decoding before judging or capturing the cover design.
    for (const image of await page.locator("main img").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => element.decode());
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.match(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontFamily), /editorialFont/);
    assert.equal(await page.getByText("A little kindness goes a long way", { exact: true }).count(), 0);
    if (process.env.SCREENSHOT_DIR) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/review-editorial-${width}.png`, fullPage: true });
    }
    assert.deepEqual(errors, [], "application runtime errors");
    assert.deepEqual(writes, [], "no anonymous accounts or review writes during UI checks");
    const missing = await page.goto(base + "/vendor/review-design-nonexistent-6bbadf/review", { waitUntil: "domcontentloaded" });
    assert.equal(missing.status(), 404);
    console.log(`PASS: ${width}px real review page, 20-character cap, keyboard stars, product selection/removal, terms/draft recovery and no eager identity.`);
    await context.close();
  }
} finally { await browser.close(); }
