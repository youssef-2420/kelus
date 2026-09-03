import assert from "node:assert/strict";
import test from "node:test";
import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import { clearEbayTokenCache, getEbayApplicationToken } from "../services/providers/ebay/auth.ts";
import { ebayBrowseSearchFilter, estimatedEbayKnownTotal, isAccessory, isActiveListing, isPartsOnly, matchesCanonicalEbayItem, matchesCondition, matchesModel, matchesStorage, normalizeEbayCondition, selectEbayDetailCandidates } from "../services/providers/ebay/matching.ts";
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
  assert.equal(normalizeEbayCondition("1500", "Open box"), "open_box");
  assert.equal(normalizeEbayCondition("2020", "Very Good - Refurbished"), "refurbished");
  assert.equal(normalizeEbayCondition("3000", "Used"), "used");
  assert.equal(normalizeEbayCondition(undefined, "Unknown"), null);
});

test("matching excludes accessories, wrong storage, wrong model, and auctions", () => {
  assert.ok(product && variant);
  assert.equal(matchesCanonicalEbayItem(validItem, product, variant, "any"), true);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Case for Apple iPhone 17 Pro 256GB" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 512GB Unlocked", shortDescription: "" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB 512GB Unlocked" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro Max 256GB Unlocked" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, buyingOptions: ["AUCTION"] }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, buyingOptions: undefined }, product, variant, "any"), false);
});

test("matching rejects parts, carrier-locked listings, ended listings, and condition conflicts", () => {
  assert.ok(product && variant);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB Logic Board" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB Unlocked for parts" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB Verizon" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB ATT Deep Blue" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB TMobile" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, title: "Apple iPhone 17 Pro 256GB ATT Unlocked" }, product, variant, "any"), true);
  assert.equal(matchesCanonicalEbayItem({ ...validItem, itemEndDate: "2025-01-01T00:00:00Z" }, product, variant, "any"), false);
  assert.equal(matchesCanonicalEbayItem(validItem, product, variant, "new"), false);
  assert.equal(isActiveListing({ ...validItem, itemEndDate: "2027-01-01T00:00:00Z" }, Date.parse("2026-08-24T00:00:00Z")), true);
});

test("accessory words in a description do not reject a real phone title", () => {
  assert.ok(product && variant);
  const phoneWithCaseMention = { ...validItem, shortDescription: "Phone includes a protective case and charging cable; not compatible with iPhone 17 Pro Max" };
  assert.equal(isAccessory(phoneWithCaseMention), false);
  assert.equal(matchesCanonicalEbayItem(phoneWithCaseMention, product, variant, "any"), true);
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

test("base iPhone 17 matching rejects sibling models", () => {
  const baseProduct = getProductBySlug("iphone-17");
  const baseVariant = getVariantById("iphone-17-256");
  assert.ok(baseProduct && baseVariant);
  const baseItem = { ...validItem, title: "Apple iPhone 17 256GB Unlocked", shortDescription: "" };
  assert.equal(matchesCanonicalEbayItem(baseItem, baseProduct, baseVariant, "any"), true);
  for (const sibling of ["iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 17 Air", "iPhone 17 Plus", "iPhone 17e"]) {
    assert.equal(matchesCanonicalEbayItem({ ...baseItem, title: `Apple ${sibling} 256GB Unlocked` }, baseProduct, baseVariant, "any"), false);
  }
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
  assert.equal(offer.sourceTitle, validItem.title);
  assert.equal(offer.affiliateUrl, "https://www.ebay.com/itm/123");
});

test("normalization uses real eBay return terms when supplied by item detail", () => {
  assert.ok(product && variant);
  const sellerPaid = normalizeEbayItem({
    ...validItem,
    returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: "DAY" }, returnShippingCostPayer: "SELLER" },
  }, product, variant, "2026-08-22T12:00:00.000Z");
  const noReturns = normalizeEbayItem({ ...validItem, returnTerms: { returnsAccepted: false } }, product, variant, "2026-08-22T12:00:00.000Z");
  assert.equal(sellerPaid?.returnPolicy, "30-day seller returns · Seller-paid return shipping");
  assert.equal(noReturns?.returnPolicy, "No returns");
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
  assert.equal(normalizeEbayItem({ ...validItem, itemWebUrl: "https://www.ebay.com/itm/999" }, product, variant, new Date().toISOString()), null);
});

test("normalization rejects impossible seller metrics instead of treating them as evidence", () => {
  assert.ok(product && variant);
  const offer = normalizeEbayItem({
    ...validItem,
    seller: { username: "bad-metrics", feedbackPercentage: "140", feedbackScore: -5 },
  }, product, variant, "2026-08-22T12:00:00.000Z");
  assert.ok(offer);
  assert.equal(offer.seller.feedbackPercentage, undefined);
  assert.equal(offer.seller.feedbackScore, undefined);
});

test("provider enriches matched offers with factual return terms", async () => {
  clearEbayTokenCache();
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    if (url.includes("/item_summary/search")) return new Response(JSON.stringify({ total: 1, itemSummaries: [{ ...validItem, condition: "New", conditionId: "1000" }] }), { status: 200 });
    if (url.includes("/buy/browse/v1/item/")) return new Response(JSON.stringify({ returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: "DAY" }, returnShippingCostPayer: "SELLER" } }), { status: 200 });
    throw new Error("Unexpected URL: " + url);
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => Date.parse("2026-08-24T12:00:00Z"));
  const result = await provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" });
  assert.equal(result.offers.length, 1);
  assert.equal(result.matchedListingCount, 1);
  assert.equal(result.unmatchedListingCount, 0);
  assert.equal(result.offers[0].returnPolicy, "30-day seller returns · Seller-paid return shipping");
  assert.equal(result.observations[0].price, 899.99);
  assert.equal(result.observations[0].shippingCost, 12.5);
});

test("provider counts unmatched search hits without treating them as offers", async () => {
  clearEbayTokenCache();
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    if (url.includes("/item_summary/search")) return new Response(JSON.stringify({
      total: 2,
      itemSummaries: [
        { ...validItem, condition: "New", conditionId: "1000" },
        { ...validItem, itemId: "v1|999|0", title: "Case for Apple iPhone 17 Pro 256GB", shortDescription: "Protective case", itemWebUrl: "https://www.ebay.com/itm/999", price: { value: "12.00", currency: "USD" } },
      ],
    }), { status: 200 });
    if (url.includes("/buy/browse/v1/item/")) return new Response(JSON.stringify({ returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: "DAY" }, returnShippingCostPayer: "SELLER" } }), { status: 200 });
    throw new Error("Unexpected URL: " + url);
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => Date.parse("2026-08-24T12:00:00Z"));
  const result = await provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" });
  assert.equal(result.offers.length, 1);
  assert.equal(result.matchedListingCount, 1);
  assert.equal(result.unmatchedListingCount, 1);
  assert.equal(result.offers[0].price, 899.99);
  assert.equal(result.offers.some((offer) => /999/.test(offer.id) || offer.price === 12), false);
});

test("provider keeps a valid offer when optional item-detail enrichment fails", async () => {
  clearEbayTokenCache();
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    if (url.includes("/item_summary/search")) return new Response(JSON.stringify({ total: 1, itemSummaries: [validItem] }), { status: 200 });
    return new Response("unavailable", { status: 503 });
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => Date.parse("2026-08-24T12:00:00Z"));
  const result = await provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" });
  assert.equal(result.offers.length, 1);
  assert.equal(result.offers[0].returnPolicy, "Return terms unavailable");
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
  const empty = await provider.getOffers(criteria);
  assert.deepEqual(empty.offers, []);
  assert.equal(empty.matchedListingCount, 0);
  assert.equal(empty.unmatchedListingCount, 0);
  assert.deepEqual((await provider.getOffers(criteria)).offers, []);
  assert.equal(searchCalls, 1);
});

test("provider deduplicates repeated eBay item identities", async () => {
  clearEbayTokenCache();
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    if (url.includes("/item_summary/search")) return new Response(JSON.stringify({ itemSummaries: [validItem, { ...validItem }] }), { status: 200 });
    return new Response(JSON.stringify({ returnTerms: { returnsAccepted: false } }), { status: 200 });
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => Date.parse("2026-08-26T12:00:00Z"));
  const result = await provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" });
  assert.equal(result.offers.length, 1);
  assert.equal(result.observations.length, 1);
});

test("browse search filters request the selected condition without loosening match rules", () => {
  assert.equal(ebayBrowseSearchFilter("new"), "buyingOptions:{FIXED_PRICE},deliveryCountry:US,conditions:{NEW}");
  assert.match(ebayBrowseSearchFilter("used"), /conditions:\{USED_EXCELLENT/);
  assert.equal(ebayBrowseSearchFilter("any"), "buyingOptions:{FIXED_PRICE},deliveryCountry:US");
});

test("detail enrichment prefers listings that are missing shipping", () => {
  const missing = { ...validItem, itemId: "v1|missing|0", shippingOptions: [] };
  const cheap = { ...validItem, itemId: "v1|cheap|0", price: { value: "10.00", currency: "USD" } };
  const selected = selectEbayDetailCandidates([cheap, missing], 1);
  assert.equal(selected[0]?.itemId, "v1|missing|0");
  assert.equal(Number.isFinite(estimatedEbayKnownTotal(missing)), false);
});

test("provider scopes eBay search to the requested condition and paginates when matches are thin", async () => {
  clearEbayTokenCache();
  const searchUrls = [];
  const match = { ...validItem, condition: "New", conditionId: "1000", title: "Apple iPhone 17 Pro 256GB Unlocked" };
  const accessory = { ...validItem, itemId: "v1|case|0", title: "Case for Apple iPhone 17 Pro 256GB", shortDescription: "Protective case", itemWebUrl: "https://www.ebay.com/itm/case" };
  const cheaper = { ...validItem, itemId: "v1|cheap|0", condition: "New", conditionId: "1000", title: "Apple iPhone 17 Pro 256GB Unlocked", price: { value: "820.00", currency: "USD" }, itemWebUrl: "https://www.ebay.com/itm/cheap" };
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    if (url.includes("/item_summary/search")) {
      searchUrls.push(url);
      const offset = new URL(url).searchParams.get("offset") ?? "0";
      if (offset === "50") return new Response(JSON.stringify({ total: 80, itemSummaries: [cheaper] }), { status: 200 });
      return new Response(JSON.stringify({ total: 80, itemSummaries: [match, accessory] }), { status: 200 });
    }
    if (url.includes("/buy/browse/v1/item/")) return new Response(JSON.stringify({ returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: "DAY" }, returnShippingCostPayer: "SELLER" } }), { status: 200 });
    throw new Error("Unexpected URL: " + url);
  };
  const provider = new EbayProvider(config, fetcher, silentLogger, () => Date.parse("2026-08-24T12:00:00Z"));
  const result = await provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" });
  assert.match(decodeURIComponent(searchUrls[0]), /conditions:\{NEW\}/);
  assert.ok(searchUrls.some((url) => url.includes("offset=50")));
  assert.equal(result.matchedListingCount, 2);
  assert.equal(result.offers.length, 2);
  assert.equal(result.offers.some((offer) => offer.price === 820), true);
});

test("provider surfaces rate limiting as a typed failure", async () => {
  clearEbayTokenCache();
  const warnings = [];
  const fetcher = async (input) => String(input).includes("/oauth2/token")
    ? new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 })
    : new Response(JSON.stringify({ errors: [] }), { status: 429 });
  const provider = new EbayProvider(config, fetcher, { ...silentLogger, warn: (...values) => warnings.push(values) });
  await assert.rejects(
    provider.getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" }),
    (error) => error instanceof EbayProviderError && error.code === "rate_limited",
  );
  assert.deepEqual(warnings[0], ["[ebay-provider] search_failed", { status: 429, code: "rate_limited" }]);
});

test("provider surfaces malformed search responses and timeouts as typed failures", async () => {
  clearEbayTokenCache();
  const malformedFetcher = async (input) => String(input).includes("/oauth2/token")
    ? new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 })
    : new Response(JSON.stringify({ itemSummaries: {} }), { status: 200 });
  await assert.rejects(
    new EbayProvider(config, malformedFetcher, silentLogger).getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" }),
    (error) => error instanceof EbayProviderError && error.code === "malformed_response",
  );

  clearEbayTokenCache();
  const timeoutConfig = { ...config, requestTimeoutMs: 5 };
  const timeoutFetcher = async (input, init) => {
    if (String(input).includes("/oauth2/token")) return new Response(JSON.stringify({ access_token: "token", expires_in: 7200 }), { status: 200 });
    await new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true }));
  };
  await assert.rejects(
    new EbayProvider(timeoutConfig, timeoutFetcher, silentLogger).getOffers({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "any", market: "us" }),
    (error) => error instanceof EbayProviderError && error.code === "timeout",
  );
});
