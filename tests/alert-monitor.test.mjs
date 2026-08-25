import assert from "node:assert/strict";
import test from "node:test";
import { monitorAlertRecords } from "../services/alert-monitor.ts";
import { createAlert } from "../services/price-alerts.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const offer = (id, price, shippingCost = 0) => ({
  id, productId: "apple-iphone-17-pro", variantId: "iphone-17-pro-256gb",
  retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" },
  seller: { id: "seller", retailerId: "ebay", name: "Seller", sellerType: "marketplace_seller" },
  price, shippingCost, shippingCostKnown: true, currency: "USD", condition: "new", delivery: "", availability: "In stock", warranty: "", returnPolicy: "30-day returns",
  affiliateUrl: `https://www.ebay.com/itm/${id}`, lastUpdated: "2026-08-25T10:00:00Z", dataSource: "live",
});
const result = (offers) => ({ offers, observations: [], failedProviders: [], isDemo: false, lastUpdated: "2026-08-25T10:00:00Z" });

test("monitor deduplicates identical configurations across users and emits factual events", async () => {
  const first = { ...createAlert(criteria, result([offer("start", 899)]), "2026-08-24T10:00:00Z"), targetPrice: 829 };
  const second = createAlert(criteria, result([offer("start", 899)]), "2026-08-24T10:00:00Z");
  let searches = 0;
  const monitored = await monitorAlertRecords([
    { userId: "user-a", alert: first },
    { userId: "user-b", alert: second },
  ], async () => { searches += 1; return result([offer("fresh", 820, 4)]); }, "2026-08-25T12:00:00Z");

  assert.equal(searches, 1);
  assert.equal(monitored.searchedConfigurations, 1);
  assert.equal(monitored.updates.length, 2);
  assert.equal(monitored.updates[0].alert.currentPrice, 824);
  assert.deepEqual(monitored.events.map((event) => event.type).sort(), ["price_drop", "target_reached"]);
  assert.equal(monitored.events.every((event) => event.data.currentPrice === 824), true);
});

test("monitor preserves the last real price when a provider check fails", async () => {
  const alert = createAlert(criteria, result([offer("start", 829)]));
  const monitored = await monitorAlertRecords([{ userId: "user-a", alert }], async () => { throw new Error("eBay unavailable"); });
  assert.equal(monitored.failedConfigurations, 1);
  assert.equal(monitored.updates[0].alert.currentPrice, 829);
  assert.equal(monitored.updates[0].alert.state, "error");
  assert.equal(monitored.events.length, 0);
});

test("paused alerts are not fetched or changed", async () => {
  const alert = { ...createAlert(criteria, result([offer("start", 829)])), paused: true };
  let searches = 0;
  const monitored = await monitorAlertRecords([{ userId: "user-a", alert }], async () => { searches += 1; return result([]); });
  assert.equal(searches, 0);
  assert.equal(monitored.updates.length, 0);
  assert.equal(monitored.searchedConfigurations, 0);
});
