import assert from "node:assert/strict";
import { createRequire } from "node:module";
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser=await chromium.launch({channel:"msedge",headless:true});
const base=process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
try {
 for(const width of [375,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();
  await page.goto(base+"/vendor/aisyah-dessert/review",{waitUntil:"domcontentloaded"});
  await page.getByRole("group",{name:"Overall experience (required)"}).locator("label").nth(3).click();
  await page.getByLabel("Tell us about your experience").fill("Draft survives reading terms.");
  await page.getByRole("group",{name:"Burnt Cheesecake",exact:true}).locator("label").nth(4).click();
  await page.getByRole("link",{name:"terms and conditions",exact:true}).first().click();
  await page.waitForURL(url=>url.pathname==="/terms"&&url.searchParams.get("review")==="aisyah-dessert");
  await page.getByRole("link",{name:"Back to your review"}).click();
  await page.waitForFunction(()=>document.querySelector("textarea")?.value==="Draft survives reading terms.");
  assert.equal(await page.getByRole("group",{name:"Overall experience (required)"}).getByRole("radio",{name:"4 stars",exact:true}).isChecked(),true);
  assert.equal(await page.getByRole("group",{name:"Burnt Cheesecake",exact:true}).getByRole("radio",{name:"5 stars",exact:true}).isChecked(),true);
  assert.equal(await page.getByRole("checkbox").isChecked(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+"/discover",{waitUntil:"domcontentloaded"});
  if(width<1024) await page.getByRole("button",{name:"Filters & sorting +"}).click();
  await page.getByLabel("State / Federal territory",{exact:true}).selectOption("putrajaya");
  assert.equal(await page.getByLabel("State / Federal territory",{exact:true}).inputValue(),"putrajaya");
  await page.goto(base+"/terms?review=https://example.com");
  assert.equal(await page.getByRole("link",{name:"Back to Singgah"}).getAttribute("href"),"/");
  console.log("PASS: "+width+"px terms round-trip retains draft and optional ratings, safe return URL, accurate location label.");
  await context.close();
 }
 // Controlled provider failures test UI recovery without creating users or bypassing server security.
 const context=await browser.newContext();const page=await context.newPage();
 await page.clock.install();
 await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",route=>route.fulfill({contentType:"application/javascript",body:
  'window.__turnstileRenders=0; window.turnstile={render(el,options){window.__turnstileRenders++; window.__options=options;return "fixture"},remove(){},reset(){if(window.__fail) setTimeout(()=>window.__options["error-callback"]("300030"),10)}};'
 }));
 await page.goto(base+"/vendor/aisyah-dessert/review",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__options);
 assert.equal(await page.evaluate(()=>window.__options.execution),"render");
 await page.getByRole("group",{name:"Overall experience (required)"}).locator("label").nth(4).click();await page.getByRole("checkbox").check();
 await page.getByRole("button",{name:"Submit Review",exact:true}).click();
 await page.waitForFunction(()=>document.body.textContent.includes("Completing the security check for your anonymous session"));
 await page.clock.fastForward(31000);
 await page.getByRole("alert").filter({hasText:"taking too long"}).waitFor();
 assert.equal(await page.getByRole("button",{name:"Submit Review",exact:true}).isEnabled(),true);
 await page.evaluate(()=>window.__fail=true);
 await page.getByRole("button",{name:"Submit Review",exact:true}).click();
 await page.clock.fastForward(1000);
 await page.getByRole("alert").filter({hasText:"300030"}).waitFor();
 assert.equal(await page.getByRole("button",{name:"Submit Review",exact:true}).isEnabled(),true);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.endsWith("-auth-token"))),false);
 console.log("PASS: background execution, bounded timeout, retry after failure, diagnostic code, no identity/submission on failed challenge.");
 await context.close();
} finally {await browser.close();}
