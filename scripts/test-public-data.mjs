import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { field, identifier } from "../src/lib/vendor-management/validation.ts";
import { compressVendorImage } from "../src/lib/vendor-management/image-compression.ts";
import { normalizeDiscovery, paginationWindow, searchExpression, DISCOVERY_PAGE_SIZE } from "../src/lib/vendors/discovery-params.ts";

// Run the actual query helpers with controlled I/O. Gates catch accidental
// waterfalls without relying on flaky wall-clock performance thresholds.
function load(path, modules) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; },
    process, File, FormData, Buffer,
  });
  return exports;
}

function fixture(results = {}, signResult = { data: [], error: null }) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, steps: [] };
      const query = { then(resolve, reject) {
        calls.push(call);
        return Promise.resolve().then(() => {
          const result = results[table] ?? { data: [], error: null };
          return typeof result === "function" ? result(call) : result;
        }).then(resolve, reject);
      } };
      for (const method of ["select", "eq", "order", "range", "limit", "in", "or", "single", "maybeSingle"]) {
        query[method] = (...args) => { call.steps.push([method, ...args]); return query; };
      }
      return query;
    },
    storage: { from(bucket) { return { async createSignedUrls(paths, ttl) {
      calls.push({ table: "sign", bucket, paths, ttl });
      return signResult;
    } }; } },
  };
  const cacheOptions = [];
  const modules = {
    "server-only": {}, "react": { cache: (fn) => fn },
    "next/cache": { unstable_cache(fn, keys, options) {
      cacheOptions.push({ keys, options });
      let cached;
      return () => cached ??= fn().catch((error) => { cached = undefined; throw error; });
    } },
    "@/lib/supabase/server": { createServerSupabaseClient: () => client },
    "./discovery-params": { DISCOVERY_PAGE_SIZE, paginationWindow, searchExpression },
  };
  return { calls, cacheOptions, modules };
}
const row = (id) => ({ id, name: `Vendor ${id}`, slug: `vendor-${id}` });
const ok = (data) => ({ data, error: null });
const options = {
  categories: [{ id: "food", slug: "food", name: "Food" }],
  subcategories: [{ id: "dessert", category_id: "food", slug: "dessert", name: "Dessert" }],
  states: [{ id: "johor", slug: "johor", name: "Johor" }],
  cities: [{ id: "jb", state_id: "johor", slug: "jb", name: "JB" }],
  areas: [{ id: "austin", city_id: "jb", slug: "austin", name: "Austin" }],
};
const querySteps = (f, table) => JSON.parse(JSON.stringify(f.calls.find((call) => call.table === table).steps));

test("reference catalogue is the only shared cache; failed loads remain retryable", async () => {
  const results = Object.fromEntries(Object.entries(options).map(([table, data]) => [table, ok(data)]));
  const f = fixture(results);
  const { getDiscoveryOptions } = load("../src/lib/vendors/discovery.ts", f.modules);
  assert.equal(JSON.stringify(await getDiscoveryOptions()), JSON.stringify(options));
  await getDiscoveryOptions();
  assert.equal(f.calls.length, 5, "second catalogue read uses the cached result");
  assert.equal(f.cacheOptions.length, 1);
  assert.equal(f.cacheOptions[0].options.revalidate, 300);
  assert.equal(f.cacheOptions[0].options.tags[0], "discovery-options");
  const failed = fixture({ ...results, areas: { data: null, error: { code: "unavailable" } } });
  const retry = load("../src/lib/vendors/discovery.ts", failed.modules).getDiscoveryOptions;
  await assert.rejects(retry(), /Unable to load discovery filters/);
  await assert.rejects(retry(), /Unable to load discovery filters/);
  assert.equal(failed.calls.length, 10);
});

test("homepage requests only three public vendors without an exact count, with batched ratings", async () => {
  const f = fixture({ vendors: ok([row("a"), row("b")]), vendor_rating_summaries: ok([{ vendor_id: "a", average_rating: 4.5, review_count: 2 }]) });
  const { getLatestVendors } = load("../src/lib/vendors/discovery.ts", f.modules);
  const vendors = await getLatestVendors();
  const steps = querySteps(f, "vendors");
  assert.deepEqual(steps.filter(([method]) => method === "eq"), [["eq", "status", "published"], ["eq", "is_active", true]]);
  assert.deepEqual(steps.filter(([method]) => method === "order"), [["order", "created_at", { ascending: false }], ["order", "id"]]);
  assert.ok(steps.some(([method, limit]) => method === "limit" && limit === 3));
  assert.equal(steps.find(([method]) => method === "select")[2].count, undefined);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(querySteps(f, "vendor_rating_summaries").at(-1), ["in", "vendor_id", ["a", "b"]]);
  assert.equal(vendors[0].rating.average_rating, 4.5);
  assert.equal(vendors[1].rating, null);
  await getLatestVendors();
  assert.equal(f.calls.length, 4, "vendor rows/ratings are not shared-cache entries");
});

test("discovery preserves AND filters, literal search, count and twelve-item pagination", async () => {
  const f = fixture({ vendors: { ...ok([row("a")]), count: 25 }, vendor_rating_summaries: ok([]) });
  const { discoverVendors } = load("../src/lib/vendors/discovery.ts", f.modules);
  const filters = normalizeDiscovery({ q: "Cake%", category: "food", subcategory: "dessert", state: "johor", city: "jb", area: "austin", page: "2" }, options);
  const result = await discoverVendors(filters, options);
  const steps = querySteps(f, "vendors");
  for (const [column, value] of [["category_id", "food"], ["subcategory_id", "dessert"], ["state_id", "johor"], ["city_id", "jb"], ["area_id", "austin"]]) {
    assert.ok(steps.some(([method, field, val]) => method === "eq" && field === column && val === value));
  }
  assert.equal(steps.find(([method]) => method === "select")[2].count, "exact");
  assert.deepEqual(steps.find(([method]) => method === "range"), ["range", 12, 23]);
  assert.equal(steps.find(([method]) => method === "or")[1], searchExpression("Cake%"));
  assert.equal(result.count, 25); assert.equal(result.pages, 3);
});

test("excessive discovery offsets still recover a count for the canonical redirect", async () => {
  let attempt = 0;
  const f = fixture({ vendors: () => ++attempt === 1 ? { data: null, error: { code: "PGRST103" } } : { ...ok([]), count: 25 } });
  const { discoverVendors } = load("../src/lib/vendors/discovery.ts", f.modules);
  const result = await discoverVendors(normalizeDiscovery({ page: "999" }, options), options);
  assert.equal(attempt, 2); assert.equal(result.pages, 3);
  assert.deepEqual(querySteps(f, "vendors").at(-1), ["range", 0, 11]);
});

test("profile image signing and product ratings start without waiting for reviews", async () => {
  let finishReviews;
  const reviewGate = new Promise((resolve) => { finishReviews = resolve; });
  const path = "vendors/v/gallery/photo.webp";
  const f = fixture({
    products: ok([{ id: "p", name: "Cake" }]),
    vendor_images: ok([{ id: "i", storage_path: path }, { id: "foreign", storage_path: "vendors/other/logo/photo.webp" }]),
    vendor_rating_summaries: ok({ average_rating: 4, review_count: 1 }),
    product_rating_summaries: ok([{ product_id: "p", average_rating: 5, rating_count: 1 }]),
    reviews: () => reviewGate,
  }, ok([{ path, signedUrl: "https://example.invalid/signed" }]));
  const { getProfileContent } = load("../src/lib/vendors/profile.ts", f.modules);
  const pending = getProfileContent("v", 2, "lowest");
  await new Promise(setImmediate);
  assert.ok(f.calls.some((call) => call.table === "product_rating_summaries"));
  const signing = f.calls.find((call) => call.table === "sign");
  assert.deepEqual([...signing.paths], [path]); assert.equal(signing.ttl, 600);
  finishReviews(ok([{ id: "r", rating: 4 }]));
  const content = await pending;
  assert.equal(content.products[0].summary.average_rating, 5);
  assert.equal(content.images[0].url, "https://example.invalid/signed");
  assert.equal(content.images[1].url, null, "foreign paths cannot acquire signed URLs");
  assert.equal(content.reviews[0].id, "r");
  const steps = querySteps(f, "reviews");
  assert.ok(steps.some(([method, key, value]) => method === "eq" && key === "status" && value === "published"));
  assert.deepEqual(steps.filter(([method]) => method === "order"), [["order", "rating", { ascending: true }], ["order", "created_at", { ascending: false }], ["order", "id"]]);
  assert.deepEqual(steps.at(-1), ["range", 10, 19]);
});

test("empty profiles skip ratings/signing; repeated reads get fresh reviews and summaries", async () => {
  let count = 0;
  const f = fixture({ products: ok([]), vendor_images: ok([]), vendor_rating_summaries: () => ok({ review_count: ++count }), reviews: ok([]) });
  const { getProfileContent } = load("../src/lib/vendors/profile.ts", f.modules);
  assert.equal((await getProfileContent("v", 1)).summary.review_count, 1);
  assert.equal((await getProfileContent("v", 1)).summary.review_count, 2);
  assert.equal(f.calls.length, 8);
  assert.ok(!f.calls.some((call) => call.table === "sign" || call.table === "product_rating_summaries"));
});

test("profile database failures remain errors, while missing storage retains placeholders", async () => {
  for (const table of ["products", "vendor_images", "vendor_rating_summaries", "reviews", "product_rating_summaries"]) {
    const f = fixture({ products: ok([{ id: "p" }]), vendor_rating_summaries: ok({}), [table]: { data: null, error: { code: "unavailable" } } });
    await assert.rejects(load("../src/lib/vendors/profile.ts", f.modules).getProfileContent("v", 1), /Unable to load/);
  }
  const f = fixture({ vendor_images: ok([{ storage_path: "vendors/v/gallery/missing.webp" }]), vendor_rating_summaries: ok({}) }, { data: null, error: { message: "Missing" } });
  assert.equal((await load("../src/lib/vendors/profile.ts", f.modules).getProfileContent("v", 1)).images[0].url, null);
});

test("business and proof uploads read the file once and preserve WebP compression and limits", async () => {
  const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#1B3D2E" } }).png().toBuffer();
  const uploads = [];
  const client = {
    rpc: async () => ok(null),
    storage: { from: (bucket) => ({ upload: async (path, bytes) => { uploads.push({ bucket, path, bytes }); return ok(null); } }) },
  };
  const actions = load("../src/lib/vendor-management/media-actions.ts", {
    sharp: (input, options) => sharp(input, JSON.parse(JSON.stringify(options))),
    "node:crypto": { randomUUID: () => "random-id" },
    "next/cache": { revalidatePath() {} },
    "@/lib/supabase/vendor": { requireBusiness: async () => ({ client, id: "v" }) },
    "./validation": { field, identifier }, "./image-compression": { compressVendorImage },
  });
  for (const [action, key, value, bucket, maxSize] of [
    [actions.uploadImage, "kind", "logo", "vendor-media", 512],
    [actions.uploadProofImage, "evidence_type", "storefront", "vendor-verification", 1600],
  ]) {
    let reads = 0;
    const file = new File([input], "image.png", { type: "image/png" });
    file.arrayBuffer = async () => { reads++; return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength); };
    const form = new FormData(); form.set(key, value); form.set("file", file);
    const result = await action({ message: "" }, form);
    assert.equal(result.ok, true, result.message);
    assert.equal(reads, 1);
    const uploaded = uploads.at(-1);
    assert.equal(uploaded.bucket, bucket);
    const metadata = await sharp(uploaded.bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.ok(metadata.width <= maxSize && metadata.height <= maxSize);
    for (const invalid of [new File(["invalid"], "image.svg", { type: "image/svg+xml" }), new File([Buffer.alloc(3 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })]) {
      form.set("file", invalid);
      const count = uploads.length;
      assert.ok(!(await action({ message: "" }, form)).ok);
      assert.equal(uploads.length, count);
    }
  }
});
