import assert from "node:assert/strict";
import test from "node:test";
import { getProductBySlug, getVariantById, products, productVariants, searchProducts } from "../lib/demo-data.ts";
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
  assert.ok(productVariants.length >= 50 && productVariants.length <= 80);
  assert.equal(new Set(products.map((product) => product.slug)).size, products.length);
  assert.equal(new Set(productVariants.map((variant) => variant.id)).size, productVariants.length);
  for (const product of products) for (const variantId of product.searchAttribute.validVariantIds) {
    const variant = getVariantById(variantId);
    assert.equal(variant?.productId, product.id);
    assert.match(canonicalProductPath({ productSlug: product.slug, variantId, condition: "new", market: "us" }), /^\/product\/[a-z0-9-]+-new$/);
  }
});

test("spacing, casing, and one-character spelling aliases resolve to one product", () => {
  for (const query of ["iphone 17 pro", "iPhone17 Pro", "iphon 17 pro", "APPLE IPHONE 17 PRO"]) {
    assert.equal(searchProducts(query)[0]?.slug, "iphone-17-pro");
  }
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
