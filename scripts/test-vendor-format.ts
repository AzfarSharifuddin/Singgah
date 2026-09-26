import assert from "node:assert/strict";
import { test } from "node:test";
import { safeWebsite, phoneNumber, reviewPageNumber, locationSummary, formatPrice } from "../src/lib/vendors/format.ts";

test("contact links reject unsafe protocols and embedded credentials", () => {
  for (const input of [null, "", "javascript:alert(1)", "data:text/html,test", "https://user:password@example.com", "not a url"]) assert.equal(safeWebsite(input), null);
  assert.equal(safeWebsite("https://example.com/menu?q=tea"), "https://example.com/menu?q=tea");
});
test("Malaysian and international numbers produce safe dial links", () => {
  assert.equal(phoneNumber("012-345 6789"), "+60123456789");
  assert.equal(phoneNumber("+60 (12) 345-6789"), "+60123456789");
  assert.equal(phoneNumber("0065 8123 4567"), "+6581234567");
  for (const input of [null, "abc", "123", "++60123456789", "tel:12345678"]) assert.equal(phoneNumber(input), null);
});
test("optional prices, duplicate place names and review page parameters", () => {
  assert.equal(formatPrice(null), null);
  assert.match(formatPrice(0)!, /0\.00/);
  assert.equal(locationSummary(null, "Kuala Lumpur", "Kuala Lumpur"), "Kuala Lumpur");
  for (const value of [undefined, "0", "-1", "1.5", "Infinity", "1000000", ["2", "3"]]) assert.equal(reviewPageNumber(value), 1);
  assert.equal(reviewPageNumber("2"), 2);
});
