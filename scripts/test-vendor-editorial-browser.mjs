import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { url, key } = getSupabaseConfig();
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.from("vendors").select("id,name,slug,phone,instagram_url,tiktok_url")
  .eq("status", "published").eq("is_active", true).order("created_at", { ascending: false }).order("id").limit(1).single();
assert.equal(error, null);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "chrome", headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const writes = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(new URL(request.url()).pathname);
  });
  for (const width of [320, 375, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${base}/vendor/${data.slug}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    await page.getByRole("heading", { name: data.name, exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const font = await page.locator("h1").evaluate((heading) => getComputedStyle(heading).fontFamily);
    assert.match(font, /editorialFont/);
    assert.equal(await page.evaluate(() => [...document.fonts].some((face) => face.family.includes("editorialFont") && face.status === "loaded")), true);
    const identity = page.getByRole("region", { name: "Vendor identity" });
    const card = await identity.boundingBox();
    assert.ok(card.x >= 24 && card.x + card.width <= width - 24 + 1, "business header is inset from both viewport edges");
    const logo = identity.getByAltText(`${data.name} logo`, { exact: true });
    if (await logo.count()) {
      const logoBox = await logo.boundingBox();
      const cover = identity.locator("img").first();
      const coverBox = await cover.boundingBox();
      assert.ok(logoBox.y < coverBox.y + coverBox.height && logoBox.y + logoBox.height > coverBox.y + coverBox.height, "logo overlaps the cover edge");
    }
    if (data.phone) {
      const call = identity.getByRole("link", { name: "Call vendor", exact: true });
      assert.equal(await call.innerText(), "");
      assert.equal(await call.locator('svg[aria-hidden="true"]').count(), 1);
      assert.match(await call.getAttribute("href"), /^tel:\+[1-9]\d{6,14}$/);
      await call.focus();
      assert.equal(await call.evaluate((link) => document.activeElement === link), true);
      const callBox = await call.boundingBox();
      assert.ok(callBox.width >= 44 && callBox.height >= 44);
    }
    for (const [label, field, asset] of [["Instagram", "instagram_url", "instagram"], ["TikTok", "tiktok_url", "tiktok"]]) {
      if (!data[field]) continue;
      const link = identity.getByRole("link", { name: label, exact: true });
      assert.equal(await link.count(), 1);
      assert.equal(await link.innerText(), "");
      const logo = link.locator("img");
      assert.match(await logo.getAttribute("src"), new RegExp(`/icons/social/${asset}\\.svg$`));
      await logo.evaluate((image) => image.decode());
      const box = await link.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
    }
    const geometry = await page.locator("#products article").evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const price = card.querySelector("footer > p").getBoundingClientRect();
      const photo = card.firstElementChild.getBoundingClientRect();
      return { top: rect.top, width: rect.width, bottom: rect.bottom, priceTop: price.top, ratio: photo.width / photo.height };
    }));
    const expectedColumns = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
    if (geometry.length) {
      assert.equal(geometry.filter((card) => Math.abs(card.top - geometry[0].top) < 1).length, Math.min(expectedColumns, geometry.length));
      for (const card of geometry) {
        assert.ok(card.width >= 270, `readable card width at ${width}px`);
        assert.ok(Math.abs(card.ratio - 4 / 3) < 0.01);
        for (const peer of geometry.filter((other) => Math.abs(other.top - card.top) < 1)) {
          assert.ok(Math.abs(card.priceTop - peer.priceTop) <= 1);
          assert.ok(Math.abs(card.bottom - peer.bottom) <= 1);
        }
      }
    }
    const background = await page.locator("#products").evaluate((section) => getComputedStyle(section).backgroundColor);
    if (geometry.length) assert.notEqual(background, await page.locator("#products article").first().evaluate((card) => getComputedStyle(card).backgroundColor));
    const nav = page.getByRole("navigation", { name: "On this page" });
    await nav.getByRole("link", { name: "Location", exact: true }).click();
    assert.equal(new URL(page.url()).hash, "#location");
    await page.getByRole("heading", { name: "Location", exact: true }).waitFor();
    await nav.getByRole("link", { name: "Reviews", exact: true }).click();
    assert.equal(new URL(page.url()).hash, "#reviews");
    if (process.env.SCREENSHOT_DIR) {
      for (const image of await page.locator("main img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((element) => element.decode().catch(() => {}));
      }
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/vendor-editorial-${width}.png`, fullPage: true });
    }
    console.log(`PASS: ${width}px, ${expectedColumns} product columns, aligned prices, real social icons, font, anchors and no overflow.`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], "UI checks must not submit data or create anonymous identities");
} finally { await browser.close(); }
