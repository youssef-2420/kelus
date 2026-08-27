import assert from "node:assert/strict";
import test from "node:test";
import { getVariantsForProduct, offers, products, searchProducts } from "../lib/demo-data.ts";
import { getRecommendation, sortOffers } from "../services/recommendations.ts";

test("catalog search and variants are canonical rather than presentation strings", () => {
  const matches = searchProducts("iph");
  assert.deepEqual(matches.map((product) => product.slug), ["iphone-17", "iphone-17-pro", "iphone-17-pro-max"]);
  assert.deepEqual(getVariantsForProduct("apple-iphone-17").map((variant) => variant.label), ["128GB", "256GB", "512GB"]);
  assert.equal(products.length, 5);
});

test("normalized offers support condition filtering and deterministic ranking", () => {
  const newOffers = offers.filter((offer) => offer.condition === "new");
  assert.equal(newOffers.length, 2);
  assert.equal(getRecommendation(offers, "cheapest")?.offerId, "ebay-iphone-17-256");
  assert.equal(getRecommendation(offers, "safest_option")?.offerId, "amazon-iphone-17-256");
  assert.equal(getRecommendation(offers, "kelus_pick")?.offerId, "amazon-iphone-17-256");
  assert.deepEqual(sortOffers(offers, "lowest").map((offer) => offer.id), ["ebay-iphone-17-256", "amazon-iphone-17-256", "best-buy-iphone-17-256"]);
});

test("search URLs preserve canonical product, variant, condition, and market values", () => {
  const params = new URLSearchParams({ product: "iphone-17", variant: "iphone-17-256", condition: "new", market: "us" });
  assert.equal(params.get("product"), "iphone-17");
  assert.equal(params.get("variant"), "iphone-17-256");
  assert.equal(params.get("condition"), "new");
  assert.equal(params.get("market"), "us");
});
