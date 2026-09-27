import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { reviewDatabase } from "./review-db-client.mjs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const db = await reviewDatabase();
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const vendorId = "00000006-0000-4000-8000-000000000001";
  const reference = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../supabase/reference/malaysian-districts.json", import.meta.url), "utf8"));
  const rows = (await db.query("select s.name state,c.name name from public.cities c join public.states s on s.id=c.state_id")).rows;
  for (const district of reference.districts) assert.ok(rows.some(row => row.state === district.state && row.name === district.name), JSON.stringify(district));
  assert.equal(Number((await db.query("select count(*) from public.states")).rows[0].count), 16);
  console.log("PASS: all 160 official district reporting units and 16 states/territories present.");
  for (const width of [375,1280]) {
    const context = await browser.newContext({ viewport: { width,height:900 } });
    const page = await context.newPage();
    const errors=[]; page.on("pageerror",error=>errors.push(error.message));
    page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
    await page.goto(base+"/vendor/aisyah-dessert",{waitUntil:"networkidle"});
    for (const sort of ["highest","lowest","newest"]) {
      await page.getByLabel("Sort reviews",{exact:true}).selectOption(sort);
      await page.getByRole("button",{name:"Apply",exact:true}).click();
      await page.waitForURL(url=>url.searchParams.get("reviewSort")===sort);
      await page.locator("#reviews article").first().waitFor();
      const expected=(await db.query("select rating from public.reviews where vendor_id=$1 and status='published' order by "+(sort==="newest"?"": "rating "+(sort==="highest"?"desc":"asc")+",")+"created_at desc,id limit 10",[vendorId])).rows.map(row=>row.rating);
      const actual=await page.locator("#reviews article").getByRole("img").evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute("aria-label").match(/[0-9.]+/)[0])));
      assert.deepEqual(actual,expected,sort);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.goto(base+"/vendor/aisyah-dessert?reviewSort=lowest&reviews=2",{waitUntil:"networkidle"});
    assert.match(await page.getByRole("link",{name:"Previous reviews"}).getAttribute("href"),/reviewSort=lowest&reviews=1/);
    await page.getByRole("link",{name:"Previous reviews"}).click();
    await page.getByLabel("Sort reviews",{exact:true}).selectOption("highest");
    await page.getByRole("button",{name:"Apply",exact:true}).click();
    await page.waitForURL(url=>url.searchParams.get("reviewSort")==="highest"&&!url.searchParams.has("reviews"));
    await page.goto(base+"/vendor/aisyah-dessert?reviewSort=invalid",{waitUntil:"networkidle"});
    assert.equal(await page.getByLabel("Sort reviews",{exact:true}).inputValue(),"newest");
    for(const path of ["/faq","/terms"]) {
      await page.getByRole("navigation",{name:"Footer"}).getByRole("link",{name:path==="/faq"?"FAQ":"Terms and conditions",exact:true}).click();
      await page.waitForURL(base+path);
      await page.getByRole("heading",{level:1}).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    if(process.env.SCREENSHOT_DIR){mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.SCREENSHOT_DIR+"/terms-"+width+".png",fullPage:true});}
    assert.deepEqual(errors,[]);
    await context.close();
    console.log("PASS: "+width+"px sorting, invalid sort fallback, pagination links/reset, FAQ/terms links, no overflow/runtime errors.");
  }
} finally { await browser.close();await db.end(); }
