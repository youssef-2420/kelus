import assert from "node:assert/strict";
import test from "node:test";
import { getVariantsForProduct, offers, products, searchProducts } from "../lib/demo-data.ts";
import { getProductIntelligenceOptions, getRelevantAttributeLabel, getSearchAttributeVariants, getVisibleSearchAttributeLabel, isValidSearchConfiguration, resolveSearchAttributeVariantId, resolveSearchAttributeVariantIdFromQuery } from "../lib/product-attributes.ts";
import { canonicalProductPath, getAlternativeProductCriteria, readCanonicalProductCriteria, readCanonicalProductSlug, readSearchCriteria, resolveConditionFromQuery, searchCriteriaToQuery, validateSearchCriteria } from "../lib/search-state.ts";
import { getRecommendation, sortOffers } from "../services/recommendations.ts";

test("catalog search and variants are canonical rather than presentation strings", () => {
  const matches = searchProducts("iph");
  assert.ok(matches.some((product) => product.slug === "iphone-17"));
  assert.ok(matches.some((product) => product.slug === "iphone-17-pro"));
  assert.ok(matches.some((product) => product.slug === "iphone-17-pro-max"));
  assert.deepEqual(getVariantsForProduct("apple-iphone-17").map((variant) => variant.label), ["128GB", "256GB", "512GB"]);
  assert.ok(products.length >= 30);
  assert.ok(products.flatMap((product) => product.searchAttribute.validVariantIds).length >= 50);
});

test("empty product states suggest only valid canonical configurations", () => {
  const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
  const alternatives = getAlternativeProductCriteria(criteria, 3);
  assert.equal(alternatives.length, 3);
  assert.ok(alternatives.every((candidate) => validateSearchCriteria(candidate)));
  assert.ok(alternatives.every((candidate) => candidate.productSlug === criteria.productSlug));
  assert.ok(alternatives.every((candidate) => canonicalProductPath(candidate).startsWith("/product/")));
  assert.ok(alternatives.every((candidate) => candidate.variantId !== criteria.variantId || candidate.condition !== criteria.condition));
});

test("alternative configurations are bounded and invalid products return none", () => {
  const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
  assert.equal(getAlternativeProductCriteria(criteria, 1).length, 1);
  assert.deepEqual(getAlternativeProductCriteria({ ...criteria, productSlug: "missing-product" }), []);
});

test("catalog covers representative high-intent electronics categories", () => {
  assert.ok(searchProducts("macbook pro").some((product) => product.slug === "macbook-pro-14-m4"));
  assert.ok(searchProducts("samsung s26 ultra").some((product) => product.slug === "galaxy-s26-ultra"));
  assert.ok(searchProducts("ps5").some((product) => product.slug === "playstation-5-slim"));
  assert.ok(searchProducts("bose qc ultra earbuds").some((product) => product.slug === "bose-quietcomfort-ultra-earbuds"));
  assert.ok(searchProducts("pixel 10 pro xl").some((product) => product.slug === "pixel-10-pro-xl"));
});

test("aliases resolve to canonical products without duplicate identities", () => {
  assert.equal(searchProducts("xbox x")[0].slug, "xbox-series-x");
  assert.equal(searchProducts("switch oled")[0].slug, "nintendo-switch-oled");
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
  assert.equal(new Set(products.flatMap((product) => product.searchAttribute.validVariantIds)).size, products.flatMap((product) => product.searchAttribute.validVariantIds).length);
});

test("search asks only for a relevant product attribute", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const laptop = products.find((product) => product.slug === "macbook-air-m4");
  const audio = products.find((product) => product.slug === "airpods-pro-2");
  assert.equal(getRelevantAttributeLabel(iphone, getVariantsForProduct(iphone.id)), "Storage");
  assert.equal(getRelevantAttributeLabel(laptop, getVariantsForProduct(laptop.id)), "Configuration");
  assert.equal(getRelevantAttributeLabel(audio, getVariantsForProduct(audio.id)), null);
});

test("Product Intelligence options follow category and explicit attribute definitions", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const laptop = products.find((product) => product.slug === "macbook-air-m4");
  const console = products.find((product) => product.slug === "playstation-5-slim");
  const audio = products.find((product) => product.slug === "airpods-pro-2");
  assert.deepEqual(getProductIntelligenceOptions(iphone, getVariantsForProduct(iphone.id)), { attributeLabel: "Storage", showsUnlockedStatus: true });
  assert.deepEqual(getProductIntelligenceOptions(laptop, getVariantsForProduct(laptop.id)), { attributeLabel: "Configuration", showsUnlockedStatus: false });
  assert.deepEqual(getProductIntelligenceOptions(console, getVariantsForProduct(console.id)), { attributeLabel: "Edition", showsUnlockedStatus: false });
  assert.deepEqual(getProductIntelligenceOptions(audio, getVariantsForProduct(audio.id)), { attributeLabel: null, showsUnlockedStatus: false });
});

test("homepage hides an attribute until a phone is selected", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const variants = getVariantsForProduct(iphone.id);
  assert.equal(getVisibleSearchAttributeLabel(iphone, variants, false), null);
  assert.equal(getVisibleSearchAttributeLabel(iphone, variants, true), "Storage");
});

test("homepage keeps the attribute hidden for a selected none product", () => {
  const audio = products.find((product) => product.slug === "airpods-pro-2");
  assert.equal(getVisibleSearchAttributeLabel(audio, getVariantsForProduct(audio.id), true), null);
});

test("changing products resets an incompatible previous variant", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const laptop = products.find((product) => product.slug === "macbook-air-m4");
  const laptopVariants = getVariantsForProduct(laptop.id);
  assert.equal(resolveSearchAttributeVariantId(laptop, laptopVariants, "iphone-17-512"), "macbook-air-m4-16-512");
  assert.equal(isValidSearchConfiguration(laptop, laptopVariants, "iphone-17-512"), false);
  assert.equal(isValidSearchConfiguration(iphone, getVariantsForProduct(iphone.id), "iphone-17-512"), true);
});

test("natural queries resolve variant and condition before canonical routing", () => {
  const macbook = products.find((product) => product.slug === "macbook-pro-16-m4");
  const macbookVariant = resolveSearchAttributeVariantIdFromQuery(macbook, getVariantsForProduct(macbook.id), "used macbook pro 16 1tb");
  assert.equal(macbookVariant, "macbook-pro-16-m4-max-36-1tb");
  assert.equal(resolveConditionFromQuery("used macbook pro 16 1tb"), "used");
  assert.equal(canonicalProductPath({ productSlug: macbook.slug, variantId: macbookVariant, condition: "used", market: "us" }), "/product/macbook-pro-16-m4-max-36-1tb-used");
});

test("none products remain valid without rendering an attribute field", () => {
  const audio = products.find((product) => product.slug === "airpods-pro-2");
  const audioVariants = getVariantsForProduct(audio.id);
  const variantId = resolveSearchAttributeVariantId(audio, audioVariants);
  assert.equal(variantId, "airpods-pro-2-usbc");
  assert.equal(isValidSearchConfiguration(audio, audioVariants, variantId), true);
  assert.equal(getVisibleSearchAttributeLabel(audio, audioVariants, true), null);
});

test("search configuration rejects undeclared variants and missing required options", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const variants = getVariantsForProduct(iphone.id);
  assert.equal(isValidSearchConfiguration(iphone, variants, undefined), false);
  assert.equal(isValidSearchConfiguration(iphone, variants, "iphone-17-pro-256gb"), false);
  assert.equal(isValidSearchConfiguration(iphone, variants, "iphone-17-256"), true);
});

test("search attribute labels follow the product model definition", () => {
  const product = (type, validVariantIds) => ({ id: type, slug: type, name: type, category: "Test category", brand: "Test", image: "T", identifiers: {}, searchAttribute: { type, validVariantIds } });
  const variants = (productId, labels) => labels.map((label, index) => ({ id: `${productId}-${index}`, productId, label, specifications: {}, identifiers: {} }));

  const phone = product("storage", ["storage-0", "storage-1"]);
  const tv = product("size", ["size-0", "size-1"]);
  const console = product("edition", ["edition-0", "edition-1"]);
  const laptop = product("configuration", ["configuration-0", "configuration-1"]);
  const accessory = product("none", []);

  assert.equal(getRelevantAttributeLabel(phone, variants(phone.id, ["128GB", "256GB"])), "Storage");
  assert.equal(getRelevantAttributeLabel(tv, variants(tv.id, ["55-inch", "65-inch"])), "Size");
  assert.equal(getRelevantAttributeLabel(console, variants(console.id, ["Digital", "Disc"])), "Edition");
  assert.equal(getRelevantAttributeLabel(laptop, variants(laptop.id, ["16GB · 512GB", "24GB · 1TB"])), "Configuration");
  assert.equal(getRelevantAttributeLabel(accessory, []), null);
  assert.equal(getRelevantAttributeLabel(product("none", ["none-0"]), variants("none", ["Standard"])), null);
});

test("product search attributes declare and constrain valid variant options", () => {
  for (const product of products) {
    const configured = getSearchAttributeVariants(product, getVariantsForProduct(product.id));
    assert.deepEqual(configured.map((variant) => variant.id), product.searchAttribute.validVariantIds);
    assert.ok(configured.every((variant) => variant.productId === product.id));
  }

  const iphone = products.find((product) => product.slug === "iphone-17");
  const unrelatedVariant = { id: "other-variant", productId: "other-product", label: "Other", specifications: {}, identifiers: {} };
  assert.equal(getSearchAttributeVariants(iphone, [...getVariantsForProduct(iphone.id), unrelatedVariant]).some((variant) => variant.id === unrelatedVariant.id), false);
});

test("normalized offers support condition filtering and deterministic ranking", () => {
  const newOffers = offers.filter((offer) => offer.condition === "new");
  assert.equal(newOffers.length, 2);
  assert.equal(getRecommendation(offers, "cheapest")?.offerId, "ebay-iphone-17-256");
  assert.equal(getRecommendation(offers, "safest_option")?.offerId, "amazon-iphone-17-256");
  assert.equal(getRecommendation(offers, "kelus_pick")?.offerId, "amazon-iphone-17-256");
  assert.deepEqual(sortOffers(offers, "lowest").map((offer) => offer.id), ["ebay-iphone-17-256", "amazon-iphone-17-256", "best-buy-iphone-17-256"]);
  assert.deepEqual(sortOffers(offers, "highest").map((offer) => offer.id), ["amazon-iphone-17-256", "best-buy-iphone-17-256", "ebay-iphone-17-256"]);
});

test("search URLs preserve canonical product, variant, condition, and market values", () => {
  const params = new URLSearchParams({ product: "iphone-17", variant: "iphone-17-256", condition: "new", market: "us" });
  assert.equal(params.get("product"), "iphone-17");
  assert.equal(params.get("variant"), "iphone-17-256");
  assert.equal(params.get("condition"), "new");
  assert.equal(params.get("market"), "us");
});

test("homepage search criteria round-trip product, storage, and condition into results", () => {
  const criteria = validateSearchCriteria({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" });
  assert.ok(criteria);
  assert.deepEqual(readSearchCriteria(new URLSearchParams(searchCriteriaToQuery(criteria))), criteria);
});

test("exact searches resolve to one persistent canonical product URL", () => {
  const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
  assert.equal(canonicalProductPath(criteria), "/product/iphone-17-pro-256gb-new");
  assert.deepEqual(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-pro-256gb", "new"), criteria);
  assert.deepEqual(readCanonicalProductSlug("iphone-17-pro-256gb-new"), criteria);
});

test("canonical product identity rejects cross-product variants and invalid conditions", () => {
  assert.equal(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-512", "new"), null);
  assert.equal(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-pro-256gb", "broken"), null);
  assert.equal(readCanonicalProductSlug("iphone-17-pro-2tb-new"), null);
});

test("submission validation rejects cross-product and unknown configurations", () => {
  assert.equal(validateSearchCriteria({ productSlug: "iphone-17-pro", variantId: "macbook-air-m4-16-512", condition: "new", market: "us" }), null);
  assert.equal(validateSearchCriteria({ productSlug: "iphone-17-pro", variantId: "unknown", condition: "new", market: "us" }), null);
});

test("results parsing replaces an incompatible product variant with a declared option", () => {
  const criteria = readSearchCriteria(new URLSearchParams({ product: "macbook-air-m4", variant: "iphone-17-512", condition: "used", market: "us" }));
  assert.deepEqual(criteria, { productSlug: "macbook-air-m4", variantId: "macbook-air-m4-16-512", condition: "used", market: "us" });
});

test("a direct Results visit resolves a complete default search", () => {
  assert.deepEqual(readSearchCriteria(new URLSearchParams()), { productSlug: "iphone-17", variantId: "iphone-17-128", condition: "any", market: "us" });
});
