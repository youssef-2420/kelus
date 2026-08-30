import assert from "node:assert/strict";
import test from "node:test";
import { getVariantsForProduct, offers, products, searchProducts } from "../lib/demo-data.ts";
import { readSearchCriteria, searchCriteriaToQuery } from "../lib/search-state.ts";
import { parseWatchedProducts } from "../lib/watchlist.ts";
import { getOffersForSearch } from "../services/offer-service.ts";
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
  const criteria = readSearchCriteria(new URLSearchParams({ product: "iphone-17", variant: "iphone-17-256", condition: "new", market: "us" }));
  assert.deepEqual(criteria, { productSlug: "iphone-17", variantId: "iphone-17-256", condition: "new", market: "us" });
  assert.equal(searchCriteriaToQuery(criteria), "product=iphone-17&condition=new&market=us&variant=iphone-17-256");
});

test("bare and invalid result URLs resolve to compatible default variants", () => {
  assert.equal(readSearchCriteria(new URLSearchParams()).variantId, "iphone-17-256");
  assert.deepEqual(
    readSearchCriteria(new URLSearchParams({ product: "macbook-air-m4", variant: "iphone-17-256" })),
    { productSlug: "macbook-air-m4", variantId: "macbook-air-m4-16-512", condition: "any", market: "us" },
  );
});

test("watchlist storage rejects malformed data and removes duplicates", () => {
  assert.deepEqual(parseWatchedProducts("{broken"), []);
  assert.deepEqual(parseWatchedProducts('["iPhone 17", 42]'), []);
  assert.deepEqual(parseWatchedProducts('["iPhone 17","iPhone 17"]'), ["iPhone 17"]);
});

test("offer aggregation reports partial failures and rejects total failure", async () => {
  const criteria = readSearchCriteria(new URLSearchParams());
  const statuses = [];
  const successfulProvider = {
    id: "working",
    async getOffers() {
      return { providerId: "working", offers: [offers[0]], observations: [], isDemo: true };
    },
  };
  const failedProvider = {
    id: "failed",
    async getOffers() {
      throw new Error("provider unavailable");
    },
  };

  const partial = await getOffersForSearch(criteria, (status) => statuses.push(status), [successfulProvider, failedProvider]);
  assert.deepEqual(partial.failedProviders, ["failed"]);
  assert.equal(partial.offers.length, 1);
  assert.equal(statuses.at(-1), "partial");
  await assert.rejects(getOffersForSearch(criteria, undefined, [failedProvider]), /All offer providers failed/);
});
