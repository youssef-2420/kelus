import assert from "node:assert/strict";
import test from "node:test";
import { getProductBySlug, getVariantById, getVariantsForProduct, products, productVariants, resolveProductSearch, searchProducts, suggestSupportedProducts } from "../lib/demo-data.ts";
import { resolveSearchAttributeVariantIdFromQuery } from "../lib/product-attributes.ts";
import { canonicalProductPath } from "../lib/search-state.ts";
import { buildEbayQuery, ebayCategoryId, matchesCanonicalEbayItem } from "../services/providers/ebay/matching.ts";
import { validateEbayCandidate } from "../services/providers/ebay/trust-engine.ts";

const cases = [
  ["iphone-17-pro", "iphone-17-pro-256gb", "Apple iPhone 17 Pro 256GB Factory Unlocked Brand New", "Cell Phones & Smartphones"],
  ["galaxy-s26", "galaxy-s26-256", "Samsung Galaxy S26 256GB Factory Unlocked Brand New", "Cell Phones & Smartphones"],
  ["pixel-10", "pixel-10-128", "Google Pixel 10 128GB Factory Unlocked Brand New", "Cell Phones & Smartphones"],
  ["macbook-air-m4", "macbook-air-m4-16-512", "Apple MacBook Air M4 16GB RAM 512GB SSD Brand New", "Laptops & Netbooks"],
  ["ipad-pro-11-m4", "ipad-pro-11-m4-256", "Apple iPad Pro 11 inch M4 256GB Brand New", "Tablets"],
  ["apple-watch-series-11", "apple-watch-series-11-42mm-gps", "Apple Watch Series 11 42mm GPS Brand New", "Smart Watches"],
  ["airpods-pro-2", "airpods-pro-2-usbc", "Apple AirPods Pro 2nd Gen USB-C Brand New", "Headphones"],
  ["sony-wh-1000xm6", "sony-wh-1000xm6", "Sony WH-1000XM6 Wireless Headphones Brand New", "Headphones"],
  ["playstation-5-slim", "playstation-5-slim-disc", "Sony PlayStation 5 Slim Disc Edition Brand New", "Video Game Consoles"],
  ["xbox-series-x", "xbox-series-x-1tb", "Microsoft Xbox Series X 1TB Brand New", "Video Game Consoles"],
  ["nintendo-switch-2", "nintendo-switch-2", "Nintendo Switch 2 Console Brand New", "Video Game Consoles"],
];

function listing(title, categoryName) {
  return {
    itemId: `v1|${title.replace(/\W/g, "").slice(0, 20)}|0`, title, condition: "New", conditionId: "1000",
    buyingOptions: ["FIXED_PRICE"], categories: [{ categoryName }],
    seller: { username: "catalog-seller", feedbackPercentage: "99.8", feedbackScore: 4000 },
  };
}

test("production catalog has deterministic unique identities for roughly fifty configurations", () => {
  assert.ok(productVariants.length >= 50 && productVariants.length <= 100);
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
  assert.equal(new Set(productVariants.map((variant) => variant.id)).size, productVariants.length);
  for (const product of products) for (const variantId of product.searchAttribute.validVariantIds) {
    const variant = getVariantById(variantId);
    assert.equal(variant?.productId, product.id);
    assert.match(canonicalProductPath({ productSlug: product.slug, variantId, condition: "new", market: "us" }), /^\/product\/[a-z0-9-]+-new$/);
  }
});

test("every catalog configuration produces a Trust Gate-compatible exact query", () => {
  const categoryNames = { Smartphone: "Cell Phones & Smartphones", Laptop: "Laptops & Netbooks", Tablet: "Tablets", Wearable: "Smart Watches", Audio: "Headphones", Console: "Video Game Consoles" };
  for (const product of products) for (const variantId of product.searchAttribute.validVariantIds) {
    const variant = getVariantById(variantId);
    assert.ok(variant, variantId);
    const item = listing(`${buildEbayQuery(product, variant)} Brand New`, categoryNames[product.category]);
    assert.equal(matchesCanonicalEbayItem(item, product, variant, "new"), true, `${product.slug}/${variantId}`);
    assert.equal(validateEbayCandidate(item, product, variant, "new").accepted, true, `${product.slug}/${variantId}`);
  }
});

test("generation-specific Apple products reject older-generation listings", () => {
  const cases = [
    ["macbook-air-m4", "macbook-air-m4-16-512", "Apple MacBook Air M3 16GB RAM 512GB SSD Brand New", "Laptops & Netbooks"],
    ["ipad-pro-11-m4", "ipad-pro-11-m4-256", "Apple iPad Pro 11 inch M2 256GB Brand New", "Tablets"],
    ["ipad-air-11-m3", "ipad-air-11-m3-128", "Apple iPad Air 11 inch M2 128GB Brand New", "Tablets"],
    ["ipad-mini-7", "ipad-mini-7-128", "Apple iPad Mini 4 128GB WiFi Brand New", "Tablets"],
    ["ipad-mini-7", "ipad-mini-7-256", "Apple iPad Mini 6 256GB WiFi Used", "Tablets"],
  ];
  for (const [productSlug, variantId, title, category] of cases) {
    const product = getProductBySlug(productSlug);
    const variant = getVariantById(variantId);
    assert.ok(product && variant);
    assert.equal(matchesCanonicalEbayItem(listing(title, category), product, variant, "new"), false, title);
  }
});

test("console listings reject games that merely mention the target console", () => {
  const product = getProductBySlug("nintendo-switch-2");
  const variant = getVariantById("nintendo-switch-2");
  assert.ok(product && variant);
  const game = listing("Hyrule Warriors: Age of Imprisonment - Nintendo Switch 2 Game", "Video Game Consoles");
  assert.equal(matchesCanonicalEbayItem(game, product, variant, "new"), false);
  assert.equal(validateEbayCandidate(game, product, variant, "new").accepted, false);
  const incomplete = listing("Nintendo Switch 2 Console Tablet Only", "Video Game Consoles");
  assert.equal(matchesCanonicalEbayItem(incomplete, product, variant, "new"), false);
});

test("audio listings reject sibling generations and replacement earbuds", () => {
  const product = getProductBySlug("airpods-pro-2");
  const variant = getVariantById("airpods-pro-2-usbc");
  assert.ok(product && variant);
  assert.equal(matchesCanonicalEbayItem(listing("Apple AirPods Pro 3 USB-C Brand New", "Headphones"), product, variant, "new"), false);
  assert.equal(matchesCanonicalEbayItem(listing("Apple AirPods Pro 2nd Gen USB-C Right Earbud Only", "Headphones"), product, variant, "new"), false);
  assert.equal(matchesCanonicalEbayItem(listing("Apple AirPods Pro 2nd Gen USB-C Left Side A3048", "Headphones"), product, variant, "new"), false);
  const sony = getProductBySlug("sony-wf-1000xm5");
  const sonyVariant = getVariantById("sony-wf-1000xm5");
  assert.ok(sony && sonyVariant);
  assert.equal(matchesCanonicalEbayItem(listing("Sony WF-1000XM5 Right (R) Earbud", "Headphones"), sony, sonyVariant, "new"), false);
});

test("AirPods 4 standard and ANC variants stay distinct", () => {
  const product = getProductBySlug("airpods-4");
  const standard = getVariantById("airpods-4-standard");
  const anc = getVariantById("airpods-4-anc");
  assert.ok(product && standard && anc);
  const ancListing = listing("Apple AirPods 4 with Active Noise Cancellation Brand New", "Headphones");
  assert.equal(matchesCanonicalEbayItem(ancListing, product, standard, "new"), false);
  assert.equal(matchesCanonicalEbayItem(ancListing, product, anc, "new"), true);
});

test("spacing, casing, and one-character spelling aliases resolve to one product", () => {
  for (const query of ["iphone 17 pro", "iPhone17 Pro", "iphon 17 pro", "APPLE IPHONE 17 PRO"]) {
    assert.equal(searchProducts(query)[0]?.slug, "iphone-17-pro");
  }
});

test("natural catalog searches resolve product and exact configuration across categories", () => {
  const cases = [
    ["iphone 17 pro 256gb new", "iphone-17-pro", "iphone-17-pro-256gb"],
    ["macbook air m4 16gb 512gb", "macbook-air-m4", "macbook-air-m4-16-512"],
    ["ipad pro 11 512gb used", "ipad-pro-11-m4", "ipad-pro-11-m4-512"],
    ["apple watch series 11 46mm", "apple-watch-series-11", "apple-watch-series-11-46mm-gps"],
    ["galaxy s26 ultra 512gb unlocked", "galaxy-s26-ultra", "galaxy-s26-ultra-512"],
    ["google pixel 10 pro 256gb", "pixel-10-pro", "pixel-10-pro-256"],
    ["ps5 slim digital", "playstation-5-slim", "playstation-5-slim-digital"],
    ["xbox series s 1tb", "xbox-series-s", "xbox-series-s-1tb"],
    ["nintendo switch oled", "nintendo-switch-oled", "nintendo-switch-oled"],
    ["dell xps 13 32gb 1tb", "dell-xps-13", "dell-xps-13-32-1tb"],
    ["steam deck oled 1tb", "steam-deck-oled", "steam-deck-oled-1tb"],
    ["galaxy z flip 7 256gb", "galaxy-z-flip-7", "galaxy-z-flip-7-256"],
    ["airpods max", "airpods-max", "airpods-max-usbc"],
    ["ipad mini 128gb", "ipad-mini-7", "ipad-mini-7-128"],
  ];
  for (const [query, slug, variantId] of cases) {
    const resolution = resolveProductSearch(query);
    assert.equal(resolution.status, "resolved", query);
    if (resolution.status !== "resolved") continue;
    assert.equal(resolution.product.slug, slug, query);
    assert.equal(resolveSearchAttributeVariantIdFromQuery(resolution.product, getVariantsForProduct(resolution.product.id), query), variantId, query);
  }
});

test("ambiguous, unsupported, carrier-locked, and incompatible searches do not silently route", () => {
  assert.equal(resolveProductSearch("iphone").status, "ambiguous");
  assert.equal(resolveProductSearch("ps5").status, "ambiguous");
  assert.equal(resolveProductSearch("dyson headphones").status, "unsupported");
  const iphone = getProductBySlug("iphone-17-pro");
  const macbook = getProductBySlug("macbook-air-m4");
  assert.ok(iphone && macbook);
  assert.equal(resolveSearchAttributeVariantIdFromQuery(iphone, getVariantsForProduct(iphone.id), "iphone 17 pro verizon"), undefined);
  assert.equal(resolveSearchAttributeVariantIdFromQuery(macbook, getVariantsForProduct(macbook.id), "macbook air m4 24gb 512gb"), undefined);
});

test("unsupported searches receive only conservative related catalog suggestions", () => {
  assert.ok(suggestSupportedProducts("dyson headphones").every((product) => product.category === "Audio"));
  assert.ok(suggestSupportedProducts("unknown samsung device").every((product) => product.brand === "Samsung"));
  assert.deepEqual(suggestSupportedProducts("garden furniture"), []);
});

test("Trust Gate validates representative exact variants from every supported category", () => {
  for (const [productSlug, variantId, title, category] of cases) {
    const product = getProductBySlug(productSlug);
    const variant = getVariantById(variantId);
    assert.ok(product && variant, `${productSlug}/${variantId} must exist`);
    const item = listing(title, category);
    assert.equal(matchesCanonicalEbayItem(item, product, variant, "new"), true, title);
    assert.equal(validateEbayCandidate(item, product, variant, "new").accepted, true, title);
    assert.ok(buildEbayQuery(product, variant).includes(product.brand));
    assert.ok(ebayCategoryId(product));
  }
});

test("catalog Trust Gate rejects wrong variants and accessories outside phones", () => {
  const product = getProductBySlug("macbook-air-m4");
  const variant = getVariantById("macbook-air-m4-16-512");
  assert.ok(product && variant);
  assert.equal(matchesCanonicalEbayItem(listing("Apple MacBook Air M4 24GB RAM 1TB SSD Brand New", "Laptops & Netbooks"), product, variant, "new"), false);
  assert.equal(matchesCanonicalEbayItem(listing("Protective sleeve only for Apple MacBook Air M4 16GB 512GB", "Laptop Accessories"), product, variant, "new"), false);
});
