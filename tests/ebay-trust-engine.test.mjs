import assert from "node:assert/strict";
import test from "node:test";
import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import { applyEbayPriceAnomalyDetection, validateEbayCandidate } from "../services/providers/ebay/trust-engine.ts";
import { getRecommendation } from "../services/recommendations.ts";

const product = getProductBySlug("iphone-17-pro");
const variant = getVariantById("iphone-17-pro-256gb");

function item(overrides = {}) {
  return {
    itemId: "v1|trusted|0",
    title: "Apple iPhone 17 Pro 256GB Factory Unlocked Brand New",
    condition: "New",
    conditionId: "1000",
    buyingOptions: ["FIXED_PRICE"],
    categories: [{ categoryId: "9355", categoryName: "Cell Phones & Smartphones" }],
    localizedAspects: [
      { name: "Model", value: "Apple iPhone 17 Pro" },
      { name: "Storage Capacity", value: "256 GB" },
      { name: "Lock Status", value: "Factory Unlocked" },
    ],
    seller: { username: "trusted-seller", feedbackPercentage: "99.8", feedbackScore: 2400 },
    ...overrides,
  };
}

function offer(id, price) {
  return {
    id,
    productId: product.id,
    variantId: variant.id,
    retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" },
    seller: { id: `seller-${id}`, retailerId: "ebay", name: id, sellerType: "marketplace_seller", feedbackPercentage: 99.8, feedbackScore: 2400 },
    price,
    currency: "USD",
    condition: "new",
    shippingCost: 0,
    shippingCostKnown: true,
    delivery: "Free shipping",
    availability: "Unknown",
    warranty: "Warranty information unavailable",
    returnPolicy: "30-day seller returns",
    affiliateUrl: `https://www.ebay.com/itm/${id}`,
    lastUpdated: "2026-08-27T12:00:00Z",
    dataSource: "live",
    sourceProvider: "ebay",
  };
}

test("trust validation rejects wrong models and sibling models", () => {
  const wrong = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro Max 256GB Factory Unlocked Brand New",
    localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro Max" }, { name: "Storage Capacity", value: "256 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  }), product, variant, "new");
  assert.equal(wrong.accepted, false);
  assert.match(wrong.reasons[0], /model conflicts|exact model/i);
});

test("trust validation accepts exact structured model, storage, unlocked, fixed-price New listings as HIGH confidence", () => {
  const validation = validateEbayCandidate(item(), product, variant, "new");
  assert.equal(validation.accepted, true);
  assert.equal(validation.confidence, "HIGH");
  assert.equal(validation.modelEvidence, "structured");
  assert.equal(validation.storageEvidence, "structured");
  assert.equal(validation.lockEvidence, "structured");
  assert.equal(validation.strongerValidation, true);
  assert.match(validation.reasons.join(" "), /exact model/i);
});

test("trust validation rejects wrong storage even when the model matches", () => {
  const wrong = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro 512GB Factory Unlocked Brand New",
    localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro" }, { name: "Storage Capacity", value: "512 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  }), product, variant, "new");
  assert.equal(wrong.accepted, false);
  assert.match(wrong.reasons[0], /storage/i);
});

test("Open Box title evidence cannot be mislabeled or stored as New", () => {
  const conflict = validateEbayCandidate(item({ title: "Apple iPhone 17 Pro 256GB Unlocked Open Box" }), product, variant, "new");
  assert.equal(conflict.accepted, false);
  assert.match(conflict.reasons[0], /condition conflict/i);

  const openBox = validateEbayCandidate(item({ conditionId: "1500", condition: "Open box", title: "Apple iPhone 17 Pro 256GB Unlocked Open Box" }), product, variant, "new");
  assert.equal(openBox.accepted, false);
  assert.match(openBox.reasons[0], /does not match requested new/i);
});

test("refurbished and used conditions stay separate from New and Open Box", () => {
  const refurbished = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro 256GB Factory Unlocked Refurbished",
    conditionId: "2000",
    condition: "Certified Refurbished",
  }), product, variant, "new");
  assert.equal(refurbished.accepted, false);
  assert.match(refurbished.reasons[0], /refurbished does not match requested new/i);

  const used = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro 256GB Factory Unlocked Used",
    conditionId: "3000",
    condition: "Used",
  }), product, variant, "new");
  assert.equal(used.accepted, false);
  assert.match(used.reasons[0], /used does not match requested new/i);
});

test("title condition evidence overrides contradictory structured New data", () => {
  const conflict = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro 256GB Factory Unlocked Refurbished",
    conditionId: "1000",
    condition: "New",
  }), product, variant, "new");
  assert.equal(conflict.accepted, false);
  assert.match(conflict.reasons[0], /Condition conflict/i);
});

test("conflicting structured lock evidence and title evidence is rejected", () => {
  const conflict = validateEbayCandidate(item({
    title: "Apple iPhone 17 Pro 256GB Verizon Locked Brand New",
    localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro" }, { name: "Storage Capacity", value: "256 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  }), product, variant, "new");
  assert.equal(conflict.accepted, false);
  assert.match(conflict.reasons[0], /title conflicts|locked/i);
});

test("missing seller evidence produces LOW confidence with explicit reasons", () => {
  const validation = validateEbayCandidate(item({ seller: undefined }), product, variant, "new");
  assert.equal(validation.accepted, true);
  assert.equal(validation.confidence, "LOW");
  assert.match(validation.reasons.join(" "), /seller identity and feedback evidence are missing/i);
});

test("dramatically cheap offers are blocked from Our Pick and price history", () => {
  const normalValidation = { ...validateEbayCandidate(item(), product, variant, "new"), confidence: "MEDIUM", strongerValidation: false };
  const candidates = [offer("normal-a", 1000), offer("normal-b", 1020), offer("normal-c", 980), offer("suspicious", 500)]
    .map((candidate) => ({ offer: candidate, validation: normalValidation }));
  const trusted = applyEbayPriceAnomalyDetection(candidates);
  const suspicious = trusted.find((candidate) => candidate.id === "suspicious");
  assert.equal(suspicious.trust.suspiciousPrice, true);
  assert.equal(suspicious.trust.confidence, "LOW");
  assert.equal(suspicious.trust.eligibleForRecommendation, false);
  assert.equal(suspicious.trust.eligibleForHistory, false);
  assert.match(suspicious.trust.reasons.at(-1), /requires stronger validation/i);
  assert.notEqual(getRecommendation(trusted, "kelus_pick")?.offerId, "suspicious");
});

test("two-offer dramatic low price is accepted but blocked with insufficient-comparison confidence", () => {
  const cheapValidation = { ...validateEbayCandidate(item({
    itemId: "cheap",
    title: "Apple iPhone 17 Pro - 256 GB - Deep Blue (Unlocked & Sealed)",
    seller: { username: "thin-evidence", feedbackPercentage: "100", feedbackScore: 1 },
    localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro" }, { name: "Storage Capacity", value: "256 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  }), product, variant, "new"), strongerValidation: true };
  const normalValidation = { ...validateEbayCandidate(item({
    itemId: "normal",
    title: "Apple iPhone 17 Pro - 256 GB - Silver (Unlocked) BRAND NEW - A3256",
    seller: { username: "strong-seller", feedbackPercentage: "99.7", feedbackScore: 1819 },
    localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro" }, { name: "Storage Capacity", value: "256 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  }), product, variant, "new"), strongerValidation: true };
  const trusted = applyEbayPriceAnomalyDetection([
    { offer: offer("cheap", 689), validation: cheapValidation },
    { offer: offer("normal", 1204), validation: normalValidation },
  ]);
  const cheap = trusted.find((candidate) => candidate.id === "cheap");
  assert.equal(cheap.trust.suspiciousPrice, true);
  assert.equal(cheap.trust.confidence, "LOW");
  assert.equal(cheap.trust.eligibleForRecommendation, false);
  assert.equal(cheap.trust.eligibleForHistory, false);
  assert.match(cheap.trust.reasons.at(-1), /Only 2 valid comparable offers/i);
  assert.equal(getRecommendation(trusted, "kelus_pick")?.offerId, "normal");
});

test("Our Pick prefers HIGH-confidence comparable offers over cheaper MEDIUM-confidence offers", () => {
  const high = { ...offer("high", 1000), trust: { confidence: "HIGH", reasons: ["Structured evidence."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true } };
  const medium = { ...offer("medium", 900), trust: { confidence: "MEDIUM", reasons: ["Title evidence."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true } };
  assert.equal(getRecommendation([medium, high], "kelus_pick")?.offerId, "high");
});
