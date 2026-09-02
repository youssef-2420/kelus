import assert from "node:assert/strict";
import test from "node:test";
import { getComparisonDemo, hasBundledSnapshot, listBundledShowcases } from "../lib/bundled-snapshot-catalog.ts";
import { formatQuickStartLabel, getSearchQuickStarts } from "../lib/search-quick-starts.ts";
import { userFacingOfferError } from "../services/user-facing-errors.ts";

test("bundled snapshot catalog exposes live showcase cards", () => {
  const showcases = listBundledShowcases();
  assert.ok(showcases.length >= 1);
  assert.ok(showcases[0].fromPrice > 0);
  assert.ok(showcases[0].href.includes("/product/"));
  assert.equal(hasBundledSnapshot({
    productSlug: "iphone-17-pro",
    variantId: "iphone-17-pro-256gb",
    condition: "new",
    market: "us",
  }), true);
});

test("search quick starts prioritize live comparisons", () => {
  const quickStarts = getSearchQuickStarts(8);
  assert.ok(quickStarts[0].live);
  assert.ok(quickStarts[0].fromPrice && quickStarts[0].fromPrice > 0);
  const labels = quickStarts.map((item) => formatQuickStartLabel(item));
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(new Set(quickStarts.map((item) => item.product.slug)).size, quickStarts.filter((item) => item.live).length);
});

test("comparison demo shows a pick that beat the cheapest known total", () => {
  const demo = getComparisonDemo();
  assert.ok(demo);
  assert.ok(demo.savingsGap && demo.savingsGap > 0);
  const pick = demo.rows.find((row) => row.role === "pick");
  const cheapest = demo.rows.find((row) => row.role === "cheapest");
  assert.ok(pick);
  assert.ok(cheapest);
  assert.notEqual(pick.id, cheapest.id);
  assert.ok(pick.knownTotal && cheapest.knownTotal && pick.knownTotal > cheapest.knownTotal);
});

test("provider errors map to shopper-safe copy", () => {
  assert.match(userFacingOfferError("provider_unconfigured", 503), /temporarily unavailable/i);
  assert.doesNotMatch(userFacingOfferError("provider_unconfigured", 503), /not configured/i);
});
