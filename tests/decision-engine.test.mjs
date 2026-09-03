import assert from "node:assert/strict";
import test from "node:test";
import { buildKelusDecision } from "../services/decision-engine.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const buildingContext = {
  currentTrustedPrice: 1000,
  average30Day: null,
  average90Day: null,
  recentLow: null,
  recentHigh: null,
  trend: "stable",
  verdict: "Price history is building",
  isDemo: false,
  historyStatus: "building",
  observationCount: 1,
  observationDayCount: 1,
};
const readyContext = {
  ...buildingContext,
  average30Day: 1100,
  recentLow: 998,
  recentHigh: 1200,
  verdict: "Good price",
  historyStatus: "ready",
  observationCount: 7,
  observationDayCount: 7,
};

function offer(id, price, overrides = {}) {
  return {
    id,
    productId: "apple-iphone-17-pro",
    variantId: "iphone-17-pro-256gb",
    retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" },
    seller: { id: `seller-${id}`, retailerId: "ebay", name: id, sellerType: "marketplace_seller", feedbackPercentage: 99.8, feedbackScore: 5000, topRated: true },
    price,
    currency: "USD",
    condition: "new",
    shippingCost: 0,
    shippingCostKnown: true,
    delivery: "Free shipping",
    availability: "Unknown",
    warranty: "Warranty information unavailable",
    returnPolicy: "30-day seller returns · Seller-paid return shipping",
    affiliateUrl: `https://www.ebay.com/itm/${id}`,
    lastUpdated: "2026-08-27T12:00:00Z",
    dataSource: "live",
    sourceProvider: "ebay",
    trust: { confidence: "HIGH", reasons: ["Validated exact product."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true },
    ...overrides,
  };
}

test("decision summary separates cheapest offer from Our Pick when evidence is stronger", () => {
  const cheapest = offer("cheap-open-box", 958, {
    condition: "open_box",
    seller: { id: "seller-cheap", retailerId: "ebay", name: "cheap", sellerType: "marketplace_seller", feedbackPercentage: 97, feedbackScore: 80 },
    returnPolicy: "No returns",
    trust: { confidence: "MEDIUM", reasons: ["Title-only match."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true },
  });
  const best = offer("best-new", 1000);
  const decision = buildKelusDecision(criteria, [cheapest, best], readyContext);
  assert.equal(decision.pick?.id, "best-new");
  assert.equal(decision.cheapest?.id, "cheap-open-box");
  assert.equal(decision.skippedCheapest?.id, "cheap-open-box");
  assert.equal(decision.cheaperMatchedCount, 1);
  assert.equal(decision.matchingListingCount, 2);
  assert.equal(decision.totalPrice, 1000);
  assert.equal(decision.confidence, "HIGH");
  assert.match(decision.cheaperTradeoff, /\$42 more than the cheapest/i);
  assert.match(decision.cheaperTradeoff, /New instead of Open Box|stronger/i);
});

test("decision never promotes LOW-confidence offers to Our Pick", () => {
  const low = offer("low", 750, { trust: { confidence: "LOW", reasons: ["Weak seller evidence."], suspiciousPrice: false, eligibleForRecommendation: false, eligibleForHistory: false } });
  const medium = offer("medium", 840, { trust: { confidence: "MEDIUM", reasons: ["Validated title evidence."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true } });
  const decision = buildKelusDecision(criteria, [low, medium], readyContext);
  assert.equal(decision.pick?.id, "medium");
  assert.notEqual(decision.pick?.id, "low");
  assert.equal(decision.skippedCheapest?.id, "low");
  assert.equal(decision.cheaperMatchedCount, 1);
});

test("decision keeps tracking as the natural action while history is insufficient", () => {
  const decision = buildKelusDecision(criteria, [offer("best", 1000)], buildingContext);
  assert.equal(decision.buyWaitDecision.label, "HISTORY BUILDING");
  assert.equal(decision.trackRecommended, true);
});

test("a tied listing is not presented as a cheaper trade-off", () => {
  const best = offer("best", 1000);
  const tied = offer("tied", 1000, {
    trust: { confidence: "MEDIUM", reasons: ["Validated title evidence."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true },
  });
  const decision = buildKelusDecision(criteria, [tied, best], readyContext);
  assert.equal(decision.pick?.id, "best");
  assert.equal(decision.cheapest?.id, "best");
  assert.equal(decision.skippedCheapest, null);
  assert.equal(decision.cheaperTradeoff, null);
  assert.equal(decision.cheaperMatchedCount, 0);
});

test("unmatched search volume is not a cheaper offer", () => {
  const pick = offer("pick", 1000);
  const decision = buildKelusDecision(criteria, [pick], readyContext);
  assert.equal(decision.skippedCheapest, null);
  assert.equal(decision.cheaperMatchedCount, 0);
  assert.equal(decision.matchingListingCount, 1);
  assert.equal(decision.cheaperTradeoff, null);
  assert.equal(decision.totalPrice, 1000);
});

test("a two-dollar cheaper LOW listing is still a skip, not hidden", () => {
  const low = offer("low-gap", 998, {
    trust: { confidence: "LOW", reasons: ["Price anomaly."], suspiciousPrice: true, eligibleForRecommendation: false, eligibleForHistory: false },
  });
  const pick = offer("pick", 1000);
  const decision = buildKelusDecision(criteria, [low, pick], readyContext);
  assert.equal(decision.pick?.id, "pick");
  assert.equal(decision.skippedCheapest?.id, "low-gap");
  assert.equal(decision.cheaperMatchedCount, 1);
  assert.match(decision.cheaperTradeoff ?? "", /unusually low/i);
});

test("decision uses ready stored history for Buy Now and waiting verdicts", () => {
  const buy = buildKelusDecision(criteria, [offer("buy", 990)], { ...readyContext, currentTrustedPrice: 990, average30Day: 1100, recentLow: 980 });
  const wait = buildKelusDecision(criteria, [offer("wait", 1130)], { ...readyContext, currentTrustedPrice: 1130, average30Day: 1000, recentLow: 950 });
  assert.equal(buy.buyWaitDecision.label, "BUY NOW");
  assert.equal(buy.trackRecommended, false);
  assert.equal(wait.buyWaitDecision.label, "CONSIDER WAITING");
  assert.equal(wait.trackRecommended, true);
});
