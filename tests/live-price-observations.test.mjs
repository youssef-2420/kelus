import assert from "node:assert/strict";
import test from "node:test";
import { offers } from "../lib/demo-data.ts";
import { getPriceContext } from "../services/price-context.ts";
import { readLivePriceObservations, storeLivePriceObservations } from "../services/price-observation-store.ts";
import { getRecommendation } from "../services/recommendations.ts";

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
  const [observation] = await readLivePriceObservations(database, "iphone-17-pro-256gb");
  assert.equal(observation.price, 829.99);
  assert.equal(observation.shippingCost, null);
  assert.equal(observation.isDemo, false);
});

test("one day of live observations remains building rather than fake history", () => {
  const liveOffer = { ...offers[0], dataSource: "live", sourceProvider: "ebay", shippingCostKnown: true };
  const context = getPriceContext([liveOffer], [liveObservation, { ...liveObservation, offerId: "ebay-offer-2", id: "second" }]);
  assert.equal(context.historyStatus, "building");
  assert.equal(context.average30Day, null);
  assert.equal(context.average90Day, null);
  assert.equal(context.verdict, "Price history is building");
});

test("Our Pick uses known total and supported eBay facts only", () => {
  const base = { ...offers[0], retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, dataSource: "live", sourceProvider: "ebay", affiliateUrl: "https://www.ebay.com/itm/1", seller: { id: "seller-a", retailerId: "ebay", name: "seller-a", sellerType: "marketplace_seller", feedbackPercentage: 99.8 } };
  const strongNewOffer = { ...base, id: "strong-new", price: 899, shippingCost: 0, shippingCostKnown: true, condition: "new", delivery: "Free shipping", warranty: "Warranty information unavailable", returnPolicy: "Return terms unavailable" };
  const cheaperRefurbished = { ...base, id: "cheaper-refurb", price: 850, shippingCost: 10, shippingCostKnown: true, condition: "refurbished", seller: { ...base.seller, feedbackPercentage: 95 }, delivery: "$10.00 shipping", warranty: "Warranty information unavailable", returnPolicy: "Return terms unavailable" };
  const recommendation = getRecommendation([strongNewOffer, cheaperRefurbished], "kelus_pick");
  assert.equal(recommendation.offerId, "strong-new");
  assert.match(recommendation.reasons.join(" "), /\$899 including shipping/);
  assert.match(recommendation.reasons.join(" "), /99\.8% eBay feedback/);
  assert.doesNotMatch(recommendation.reasons.join(" "), /unavailable|unknown/i);
});
