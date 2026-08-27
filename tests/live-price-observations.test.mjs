import assert from "node:assert/strict";
import test from "node:test";
import { offers } from "../lib/demo-data.ts";
import { getPriceContext } from "../services/price-context.ts";
import { readLivePriceObservations, storeLivePriceObservations } from "../services/price-observation-store.ts";
import { getCheaperAlternative, getRecommendation, knownOfferTotal, sortOffers } from "../services/recommendations.ts";

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.args = [];
  }
  bind(...args) {
    this.args = args;
    return this;
  }
  async all() {
    return { results: this.database.rows };
  }
}

class FakeD1 {
  constructor(rows = []) {
    this.rows = rows;
    this.batches = [];
  }
  prepare(sql) {
    return new FakeStatement(this, sql);
  }
  async batch(statements) {
    this.batches.push(statements);
    return statements.map((statement) => ({ meta: { changes: statement.sql.startsWith("INSERT") ? 1 : 0 } }));
  }
}

const liveObservation = {
  id: "ebay-offer-1-2026-08-22",
  offerId: "ebay-offer-1",
  variantId: "iphone-17-pro-256gb",
  providerId: "ebay",
  retailerId: "ebay",
  price: 829.99,
  shippingCost: 12.5,
  condition: "new",
  availability: "Unknown",
  timestamp: "2026-08-22T12:00:00.000Z",
  isDemo: false,
};

test("live observations persist canonical IDs and exact price/shipping cents", async () => {
  const database = new FakeD1();
  assert.equal(await storeLivePriceObservations(database, "apple-iphone-17-pro", [liveObservation]), 1);
  const insert = database.batches.at(-1)[0];
  assert.equal(insert.args[0], "apple-iphone-17-pro");
  assert.equal(insert.args[1], "iphone-17-pro-256gb");
  assert.equal(insert.args[2], "ebay");
  assert.equal(insert.args[5], 82999);
  assert.equal(insert.args[6], 1250);
});

test("stored observations normalize back into live Kelus history", async () => {
  const database = new FakeD1([{
    offer_id: "ebay-offer-1",
    variant_id: "iphone-17-pro-256gb",
    provider_id: "ebay",
    retailer_id: "ebay",
    price_cents: 82999,
    shipping_cents: null,
    condition: "new",
    availability: "Unknown",
    observed_at: "2026-08-22T12:00:00.000Z",
  }]);
  const [observation] = await readLivePriceObservations(database, "apple-iphone-17-pro", "iphone-17-pro-256gb", "new");
  assert.equal(observation.price, 829.99);
  assert.equal(observation.shippingCost, null);
  assert.equal(observation.isDemo, false);
});

test("one day of live observations remains building rather than fake history", () => {
  const context = getPriceContext({ productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" }, [liveObservation, { ...liveObservation, offerId: "ebay-offer-2", id: "second" }]);
  assert.equal(context.historyStatus, "building");
  assert.equal(context.average30Day, null);
  assert.equal(context.average90Day, null);
  assert.equal(context.verdict, "Price history is building");
});

test("Our Pick uses known total and supported eBay facts only", () => {
  const trust = { confidence: "MEDIUM", reasons: ["Validated product."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true };
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay", affiliateUrl: "https://www.ebay.com/itm/1", trust, seller: { id: "seller-a", retailerId: "ebay", name: "seller-a", sellerType: "marketplace_seller", feedbackPercentage: 99.8 } };
  const strongNewOffer = { ...base, id: "strong-new", price: 899, shippingCost: 0, shippingCostKnown: true, condition: "new", delivery: "Free shipping", warranty: "Warranty information unavailable", returnPolicy: "Return terms unavailable" };
  const cheaperRefurbished = { ...base, id: "cheaper-refurb", price: 850, shippingCost: 10, shippingCostKnown: true, condition: "refurbished", seller: { ...base.seller, feedbackPercentage: 95 }, delivery: "$10.00 shipping", warranty: "Warranty information unavailable", returnPolicy: "Return terms unavailable" };
  const recommendation = getRecommendation([strongNewOffer, cheaperRefurbished], "kelus_pick");
  assert.equal(recommendation.offerId, "strong-new");
  assert.match(recommendation.reasons.join(" "), /\$899 total including shipping/);
  assert.match(recommendation.reasons.join(" "), /99\.8% eBay feedback/);
  assert.doesNotMatch(recommendation.reasons.join(" "), /unavailable|unknown/i);
});

test("price comparison includes shipping and deprioritizes unknown shipping", () => {
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay" };
  const cheapItemHighShipping = { ...base, id: "high-shipping", price: 790, shippingCost: 20, shippingCostKnown: true };
  const higherItemFreeShipping = { ...base, id: "free-shipping", price: 799, shippingCost: 0, shippingCostKnown: true };
  const unknownShipping = { ...base, id: "unknown-shipping", price: 700, shippingCost: 0, shippingCostKnown: false };
  assert.equal(knownOfferTotal(cheapItemHighShipping), 810);
  assert.equal(getRecommendation([cheapItemHighShipping, higherItemFreeShipping, unknownShipping], "cheapest")?.offerId, "free-shipping");
  assert.deepEqual(sortOffers([cheapItemHighShipping, higherItemFreeShipping, unknownShipping], "lowest").map((offer) => offer.id), ["free-shipping", "high-shipping", "unknown-shipping"]);
});

test("Our Pick is withheld when no offer has a known total including shipping", () => {
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay", shippingCost: 0, shippingCostKnown: false };
  assert.equal(getRecommendation([
    { ...base, id: "unknown-a", price: 700 },
    { ...base, id: "unknown-b", price: 750 },
  ], "kelus_pick"), null);
});

test("known totals are rounded to currency precision", () => {
  const offer = { ...offers[0], price: 899.99, shippingCost: 49.99, shippingCostKnown: true };
  assert.equal(knownOfferTotal(offer), 949.98);
});

test("Our Pick balances modest price differences against real seller and return evidence", () => {
  const trust = { confidence: "MEDIUM", reasons: ["Validated product."], suspiciousPrice: false, eligibleForRecommendation: true, eligibleForHistory: true };
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay", condition: "new", shippingCost: 0, shippingCostKnown: true, warranty: "Warranty information unavailable", trust };
  const weakSeller = { ...base, id: "weak", price: 790, seller: { ...base.seller, sellerType: "marketplace_seller", feedbackPercentage: 93, feedbackScore: 12 }, returnPolicy: "No returns", delivery: "Free shipping" };
  const strongSeller = { ...base, id: "strong", price: 805, trust: { ...trust, confidence: "HIGH" }, seller: { ...base.seller, sellerType: "marketplace_seller", feedbackPercentage: 99.8, feedbackScore: 5000, topRated: true }, returnPolicy: "30-day seller returns · Seller-paid return shipping", delivery: "Free shipping" };
  const recommendation = getRecommendation([weakSeller, strongSeller], "kelus_pick");
  assert.equal(recommendation?.offerId, "strong");
  assert.deepEqual(recommendation?.reasons, ["$805 total including shipping", "99.8% eBay feedback", "30-day seller returns · Seller-paid return shipping"]);
});

test("cheaper alternative requires meaningful savings and states a factual trade-off", () => {
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay", shippingCost: 0, shippingCostKnown: true };
  const pick = { ...base, id: "pick", price: 829, condition: "new" };
  const refurbished = { ...base, id: "refurb", price: 789, condition: "refurbished" };
  const smallDifference = { ...base, id: "small", price: 825, condition: "new" };
  assert.equal(getCheaperAlternative([pick, refurbished], pick)?.tradeoff, "Save $40 with refurbished condition instead of new.");
  assert.equal(getCheaperAlternative([pick, smallDifference], pick), null);
});
