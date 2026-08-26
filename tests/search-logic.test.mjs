import assert from "node:assert/strict";
import test from "node:test";
import { getVariantsForProduct, offers, products, searchProducts } from "../lib/demo-data.ts";
import { getRelevantAttributeLabel, getSearchAttributeVariants, getVisibleSearchAttributeLabel, isValidSearchConfiguration, resolveSearchAttributeVariantId } from "../lib/product-attributes.ts";
import { canonicalProductPath, readCanonicalProductCriteria, readSearchCriteria, searchCriteriaToQuery, validateSearchCriteria } from "../lib/search-state.ts";
import { getRecommendation, sortOffers } from "../services/recommendations.ts";

test("catalog search and variants are canonical rather than presentation strings", () => {
  const matches = searchProducts("iph");
  assert.deepEqual(matches.map((product) => product.slug), ["iphone-17", "iphone-17-pro", "iphone-17-pro-max"]);
  assert.deepEqual(getVariantsForProduct("apple-iphone-17").map((variant) => variant.label), ["128GB", "256GB", "512GB"]);
  assert.equal(products.length, 5);
});

test("search asks only for a relevant product attribute", () => {
  const iphone = products.find((product) => product.slug === "iphone-17");
  const laptop = products.find((product) => product.slug === "macbook-air-m4");
  const audio = products.find((product) => product.slug === "airpods-pro-2");
  assert.equal(getRelevantAttributeLabel(iphone, getVariantsForProduct(iphone.id)), "Storage");
  assert.equal(getRelevantAttributeLabel(laptop, getVariantsForProduct(laptop.id)), "Configuration");
  assert.equal(getRelevantAttributeLabel(audio, getVariantsForProduct(audio.id)), null);
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
  assert.equal(canonicalProductPath(criteria), "/product/iphone-17-pro/iphone-17-pro-256gb/new");
  assert.deepEqual(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-pro-256gb", "new"), criteria);
});

test("canonical product identity rejects cross-product variants and invalid conditions", () => {
  assert.equal(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-512", "new"), null);
  assert.equal(readCanonicalProductCriteria("iphone-17-pro", "iphone-17-pro-256gb", "broken"), null);
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
