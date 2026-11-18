import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "chrome", headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
if (process.env.SCREENSHOT_DIR) mkdirSync(process.env.SCREENSHOT_DIR, { recursive: true });
try {
  const page = await browser.newPage();
  const errors = [];
  const writes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().startsWith(base)) writes.push(new URL(request.url()).pathname);
    if (request.method() === "POST" && new URL(request.url()).pathname.startsWith("/auth/v1/")) writes.push("auth request");
  });
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(base + "/vendor/register", { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    const password = page.getByLabel("Password", { exact: true });
    await password.waitFor();
    await page.waitForFunction(() => {
      const input = document.querySelector('input[name="password"]');
      return input && Object.keys(input).some((key) => key.startsWith("__reactProps"));
    });
    assert.equal(await password.getAttribute("minlength"), "12");
    assert.equal(await password.getAttribute("maxlength"), "128");
    assert.equal(await password.getAttribute("autocomplete"), "new-password");
    assert.ok(await password.getAttribute("pattern"));
    const requirements = page.getByRole("list", { name: "Password requirements", exact: true });
    assert.equal(await requirements.getByRole("listitem").count(), 4);
    assert.equal(await requirements.locator('[data-met="true"]').count(), 0);
    for (const [value, expected] of [["abcdefghijkl", 1], ["abcdefghijkL", 2], ["abcdefghijkL1", 3], ["abcdefghijkL1!", 4], ["abcdefghijkL1", 3]]) {
      await password.fill(value);
      await page.waitForFunction((count) => document.querySelectorAll('#vendor-password-requirements [data-met="true"]').length === count, expected);
      for (const item of await requirements.getByRole("listitem").all()) {
        const met = await item.getAttribute("data-met") === "true";
        assert.equal(await item.locator(met ? "svg path" : "svg circle").count(), 1);
        const color = await item.evaluate((element) => getComputedStyle(element).color);
        assert.equal(color, met ? "rgb(37, 100, 71)" : "rgb(93, 102, 95)");
      }
      assert.equal(await password.evaluate((input) => input.validity.patternMismatch), expected !== 4);
    }
    await password.fill("Short1!");
    assert.equal(await password.evaluate((input) => input.checkValidity()), false);
    await page.getByLabel("Email", { exact: true }).fill("vendor@example.test");
    await password.fill("LocalVendor1!");
    await page.waitForFunction(() => document.querySelectorAll('#vendor-password-requirements [data-met="true"]').length === 4);
    assert.equal(await page.locator("form").evaluate((form) => form.checkValidity()), true);
    await page.evaluate(() => document.fonts.ready);
    const image = page.locator("main img");
    await image.evaluate((image) => image.decode());
    const imageBox = await image.boundingBox();
    const mainBox = await page.locator("main").boundingBox();
    const formBox = await page.locator("form").boundingBox();
    assert.ok(Math.abs(imageBox.width - width) < 1 && Math.abs(imageBox.height - mainBox.height) < 1);
    assert.ok(formBox.x >= imageBox.x && formBox.y >= imageBox.y && formBox.y + formBox.height <= imageBox.y + imageBox.height);
    assert.equal(await image.getAttribute("sizes"), "100vw");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (process.env.SCREENSHOT_DIR) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/registration-checklist-${width}.png`, fullPage: true });
    }
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.waitForURL(base + "/vendor/login");
    const loginPassword = page.getByLabel("Password", { exact: true });
    await loginPassword.waitFor();
    assert.equal(await loginPassword.getAttribute("autocomplete"), "current-password");
    assert.equal(await loginPassword.getAttribute("pattern"), null);
    assert.equal(await loginPassword.getAttribute("minlength"), null);
    assert.equal(await page.getByRole("list", { name: "Password requirements", exact: true }).count(), 0);
    await loginPassword.fill("old-password");
    assert.equal(await loginPassword.evaluate((input) => input.checkValidity()), true);
    console.log(`PASS: ${width}px wallpaper, live green checks, native policy enforcement, no overflow and unchanged sign-in rules.`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, [], "UI checks must not create accounts, send emails or sign in");
} finally { await browser.close(); }
