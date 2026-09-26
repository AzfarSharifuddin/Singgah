import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "pgsql-parser";

// Inspect actual SQL fixtures, not a duplicated JavaScript seed.
const ast = await parse(readFileSync("supabase/seed.sql", "utf8"));
const rows = {};
function literal(node) {
  const value = node.A_Const;
  assert.ok(value, "Seed should contain explicit SQL literals");
  if (value.isnull) return null;
  if (value.sval) return value.sval.sval;
  if (value.ival) return value.ival.ival ?? 0;
  throw new Error("Unsupported seed literal");
}
for (const { stmt } of ast.stmts) {
  const insert = stmt.InsertStmt;
  assert.ok(insert, "Seed should only insert fixtures");
  const columns = insert.cols.map(({ ResTarget }) => ResTarget.name);
  rows[insert.relation.relname] = insert.selectStmt.SelectStmt.valuesLists.map(({ List }) =>
    Object.fromEntries(List.items.map((value, index) => [columns[index], literal(value)])));
}
const find = (table, id) => {
  const result = rows[table].find((row) => row.id === id);
  assert.ok(result, `Missing ${table} foreign key ${id}`);
  return result;
};
const unique = (table, fields) => {
  const keys = rows[table].map((row) => JSON.stringify(fields.map((field) => row[field])));
  assert.equal(new Set(keys).size, keys.length, `${table}: duplicate ${fields.join(",")}`);
};
for (const table of Object.keys(rows)) unique(table, ["id"]);
for (const table of ["states", "categories", "vendors"]) unique(table, ["slug"]);
unique("cities", ["state_id", "slug"]);
unique("areas", ["city_id", "slug"]);
unique("subcategories", ["category_id", "slug"]);
unique("product_ratings", ["review_id", "product_id"]);
for (const row of rows.cities) find("states", row.state_id);
for (const row of rows.areas) find("cities", row.city_id);
for (const row of rows.subcategories) find("categories", row.category_id);
for (const row of rows.vendors) {
  find("categories", row.category_id);
  assert.equal(find("cities", row.city_id).state_id, row.state_id);
  assert.equal(find("areas", row.area_id).city_id, row.city_id);
  if (row.subcategory_id) assert.equal(find("subcategories", row.subcategory_id).category_id, row.category_id);
}
for (const row of rows.products) {
  find("vendors", row.vendor_id);
  assert.ok(row.price === null || row.price >= 0);
}
for (const row of rows.reviews) {
  find("vendors", row.vendor_id);
  assert.ok(Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5);
}
for (const row of rows.product_ratings) {
  assert.equal(find("reviews", row.review_id).vendor_id, row.vendor_id);
  assert.equal(find("products", row.product_id).vendor_id, row.vendor_id);
  assert.ok(Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5);
}
const aisyah = rows.vendors.find((row) => row.slug === "aisyah-dessert");
const published = rows.reviews.filter((row) => row.vendor_id === aisyah.id && row.status === "published");
assert.equal(published.length, 2);
assert.equal(published.reduce((total, row) => total + row.rating, 0) / published.length, 4.5);
console.log("PASS: SQL fixture uniqueness, hierarchy, foreign keys, prices and ratings.");
console.log(Object.fromEntries(Object.entries(rows).map(([table, values]) => [table, values.length])));
