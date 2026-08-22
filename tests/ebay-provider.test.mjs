import assert from "node:assert/strict";
import test from "node:test";
import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import { clearEbayTokenCache, getEbayApplicationToken } from "../services/providers/ebay/auth.ts";
import { isAccessory, isPartsOnly, matchesCanonicalEbayItem, matchesCondition, matchesModel, matchesStorage, normalizeEbayCondition } from "../services/providers/ebay/matching.ts";
import { normalizeEbayItem } from "../services/providers/ebay/normalize.ts";
import { EbayProvider, EbayProviderError } from "../services/providers/ebay/provider.ts";

const config = {
  clientId: "test-client",
  clientSecret: "test-secret",
  marketplaceId: "EBAY_US",
  apiBaseUrl: "https://api.ebay.com",
  cacheTtlMs: 60_000,
  requestTimeoutMs: 2_000,
};
const product = getProductBySlug("iphone-17-pro");
const variant = getVariantById("iphone-17-pro-256gb");
const silentLogger = { info() {}, warn() {}, error() {} };

const validItem = {
  itemId: "v1|123|0",
  title: "Apple iPhone 17 Pro 256GB Unlocked",
  shortDescription: "Apple smartphone 256GB",
  price: { value: "899.99", currency: "USD" },
  condition: "Very Good - Refurbished",
  conditionId: "2020",
  buyingOptions: ["FIXED_PRICE"],
  categories: [{ categoryId: "9355", categoryName: "Cell Phones & Smartphones" }],
  itemWebUrl: "https://www.ebay.com/itm/123",
  seller: { username: "phone-seller", feedbackPercentage: "99.7", feedbackScore: 4200 },
  shippingOptions: [{ shippingCost: { value: "12.50", currency: "USD" }, minEstimatedDeliveryDate: "2026-09-02T00:00:00Z" }],
};

test("application token helper caches a valid token and never needs a second token request", async () => {
  clearEbayTokenCache();
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return new Response(JSON.stringify({ access_token: "token-value", expires_in: 7200, token_type: "Application Access Token" }), { status: 200 });
  };
  assert.equal(await getEbayApplicationToken(config, fetcher, 1_000), "token-value");
  assert.equal(await getEbayApplicationToken(config, fetcher, 2_000), "token-value");
  assert.equal(calls, 1);
});

test("application token helper rejects failed and malformed token responses", async () => {
  clearEbayTokenCache();
  await assert.rejects(
    getEbayApplicationToken(config, async () => new Response("unauthorized", { status: 401 })),
    (error) => error.name === "EbayAuthError" && error.status === 401,
  );
  clearEbayTokenCache();
  await assert.rejects(
    getEbayApplicationToken(config, async () => new Response(JSON.stringify({ expires_in: 7200 }), { status: 200 })),
    (error) => error.name === "EbayAuthError",
  );
});

test("eBay conditions normalize into Kelus conditions", () => {
  assert.equal(normalizeEbayCondition("1000", "New"), "new");
  assert.equal(normalizeEbayCondition("2020", "Very Good - Refurbished"), "refurbished");
  assert.equal(normalizeEbayCondition("3000", "Used"), "used");
  assert.equal(normalizeEbayCondition(undefined, "Unknown"), null);
});

test("matching excludes accessories, wrong storage, wrong model, and auctions", () => {
  assert.ok(product && variant);
  assert.equal(matchesCanonicalEbayItem(validItem, product, variant, "any"), true);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Case for Apple iPhone 17 Pro 256GB" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 512GB Unlocked", shortDescription: "" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro Max 256GB Unlocked" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, buyingOptions: ["AUCTION"] }, product, variant, "any"), false);
});

test("matching checks remain independently testable and conservative", () => {
  assert.ok(product && variant);
  assert.equal(matchesModel(validItem, product), true);
  assert.equal(matchesStorage(validItem, variant), true);
  assert.equal(matchesCondition(validItem, "refurbished"), true);
  assert.equal(matchesCondition(validItem, "new"), false);
  assert.equal(isAccessory({ ...validItem, title: "Screen protector for iPhone 17 Pro 256GB" }), true);
  assert.equal(isPartsOnly({ ...validItem, title: "Apple iPhone 17 Pro 256GB for parts only" }), true);
});

test("normalization maps price, shipping, seller, condition, and destination without inventing warranty", () => {
  assert.ok(product && variant);
  const offer = normalizeEbayItem(validItem, product, variant, "2026-08-22T12:00:00.000Z");
  assert.ok(offer);
  assert.equal(offer.price, 899.99);
  assert.equal(offer.shippingCost, 12.5);
  assert.equal(offer.shippingCostKnown, true);
  assert.equal(offer.condition, "refurbished");
  assert.equal(offer.seller.name, "phone-seller");
  assert.equal(offer.seller.feedbackPercentage, 99.7);
  assert.equal(offer.warranty, "Warranty information unavailable");
  assert.equal(offer.returnPolicy, "Return terms unavailable");
  assert.equal(offer.dataSource, "live");
  assert.equal(offer.affiliateUrl, "https://www.ebay.com/itm/123");
});

test("normalization keeps unknown shipping distinct from free shipping", () => {
  assert.ok(product && variant);
  const offer = normalizeEbayItem({ ...validItem, shippingOptions: [] }, product, variant, "2026-08-22T12:00:00.000Z");
  assert.ok(offer);
  assert.equal(offer.shippingCost, 0);
  assert.equal(offer.shippingCostKnown, false);
  assert.equal(offer.delivery, "Shipping details unavailable");
});

test("top-rated metadata does not invent unavailable return terms", () => {
  assert.ok(product && variant);
  const offer = normalizeEbayItem({ ...validItem, topRatedBuyingExperience: true }, product, variant, "2026-08-22T12:00:00.000Z");
  assert.ok(offer);
  assert.equal(offer.seller.topRated, true);
  assert.equal(offer.returnPolicy, "Return terms unavailable");
});

test("normalization rejects malformed prices and unsafe destination URLs", () => {
  assert.ok(product && variant);
  assert.equal(normalizeEbayItem({ ...validItem, price: { value: "not-a-price", currency: "USD" } }, product, variant, new Date().toISOString()), null);
  assert.equal(normalizeEbayItem({ ...validItem, itemWebUrl: "https://example.com/not-ebay" }, product, variant, new Date().toISOString()), null);
});

test("provider returns zero offers cleanly and caches identical searches", async () => {
  clearEbayTokenCache();
  let searchCalls = 0;
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    searchCalls += 1;
    return new Response(JSON.stringify({ total: 0, itemSummaries: [] }), { status: 200 });
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => 10_000);
  const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" };
  assert.deepEqual((await provider.getOffers(criteria)).offers, []);
  assert.deepEqual((await provider.getOffers(criteria)).offers, []);
  assert.equal(searchCalls, 1);
});

test("provider surfaces rate limiting as a typed failure", async () => {
  clearEbayTokenCache();
  const fetcher = async (input) => String(input).includes("/oauth2/token")
    ? new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 })
    : new Response(JSON.stringify({ errors: [] }), { status: 429 });
  const provider = new EbayProvider(config, fetcher, silentLogger);
  await assert.rejects(
    provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" }),
    (error) => error instanceof EbayProviderError && error.code === "rate_limited",
  );
});
