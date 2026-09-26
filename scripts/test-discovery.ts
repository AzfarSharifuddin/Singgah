import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";
import type { Database } from "../src/types/database.ts";
import { discoveryUrl, normalizeDiscovery, needsCanonicalRedirect, paginationWindow, searchExpression, type DiscoveryOptions } from "../src/lib/vendors/discovery-params.ts";

test("URL normalization preserves valid parents and resets incompatible children", () => {
  const options: DiscoveryOptions = {
    categories: [{ id: "food", name: "Food", slug: "food" }],
    subcategories: [{ id: "dessert", category_id: "food", name: "Dessert", slug: "dessert" }],
    states: [{ id: "johor", name: "Johor", slug: "johor" }],
    cities: [{ id: "jb", name: "JB", slug: "jb", state_id: "johor" }],
    areas: [{ id: "austin", name: "Austin", slug: "austin", city_id: "jb" }],
  };
  const filters = normalizeDiscovery({ q: "  Cake  ", category: "bad", subcategory: "dessert", state: "johor", city: "jb", area: "austin", page: "2" }, options);
  assert.equal(filters.q, "Cake"); assert.equal(filters.subcategory, "");
  assert.equal(discoveryUrl(filters), "/discover?q=Cake&state=johor&city=jb&area=austin&page=2");
  assert.equal(normalizeDiscovery({ city: "jb", area: "austin", page: "-1" }, options).area, "");
  assert.equal(normalizeDiscovery({ q: ["a", "b"], sort: "rating", page: "1e9" }, options).page, 1);
  assert.ok(needsCanonicalRedirect({ q: " " }, normalizeDiscovery({ q: " " }, options)));
  assert.ok(!needsCanonicalRedirect({ state: "johor", q: "Cake" }, normalizeDiscovery({ q: "Cake", state: "johor" }, options)));
  assert.deepEqual(paginationWindow(2), { from: 12, to: 23 });
  assert.equal(discoveryUrl({ ...filters, page: 3 }).includes("state=johor"), true);
});

test("hosted public queries: literal search and disjoint pagination without changing fixtures", async () => {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const { url, key } = getSupabaseConfig();
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [q, expected] of [["AISYAH", 1], ["Fictional development", 5], ["%", 0], ["_", 0], ['\",status.eq.draft)', 0], ["\\", 0]] as const) {
    const result = await client.from("vendors").select("id,name").eq("status", "published").eq("is_active", true).or(searchExpression(q));
    assert.equal(result.error, null, `Search grammar for ${q}`); assert.equal(result.data?.length, expected, `Search result for ${q}`);
  }
  const collected: string[] = [];
  for (const page of [1, 2, 3]) {
    const { from, to } = paginationWindow(page, 2);
    const result = await client.from("vendors").select("id,name", { count: "exact" }).eq("status", "published").eq("is_active", true).order("name").order("id").range(from, to);
    assert.equal(result.error, null); assert.equal(result.count, 5);
    assert.equal(result.data?.length, page === 3 ? 1 : 2);
    collected.push(...result.data!.map((vendor) => vendor.id));
  }
  assert.equal(new Set(collected).size, 5, "No duplicated or skipped vendors across page windows");
});
