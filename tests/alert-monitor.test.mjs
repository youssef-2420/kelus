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
const observation = (day, price) => ({
  id: `obs-${day}`, offerId: `offer-${day}`, variantId: criteria.variantId, providerId: "ebay", retailerId: "ebay",
  price, shippingCost: 0, condition: "new", availability: "In stock", timestamp: `2026-08-${String(day).padStart(2, "0")}T12:00:00Z`, isDemo: false,
});

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

test("background refresh reuses stored observations for price intelligence and Buy-Wait status", async () => {
  const alert = createAlert(criteria, result([offer("start", 899)]), "2026-08-10T10:00:00Z");
  const observations = [18, 19, 20, 21, 22, 23, 24].map((day) => observation(day, day === 24 ? 820 : 900));
  const monitored = await monitorAlertRecords([{ userId: "user-a", alert }], async () => ({
    ...result([offer("fresh", 820)]), observations, observationsStored: true,
  }), "2026-08-24T12:00:00Z");

  const updated = monitored.updates[0].alert;
  assert.equal(updated.priceIntelligence.historyStatus, "ready");
  assert.equal(updated.priceIntelligence.currentTrustedPrice, 820);
  assert.equal(updated.buyWaitDecision.label, "BUY NOW");
});

test("background refresh never invents intelligence when observation storage is unavailable", async () => {
  const alert = createAlert(criteria, result([offer("start", 899)]));
  const monitored = await monitorAlertRecords([{ userId: "user-a", alert }], async () => ({
    ...result([offer("fresh", 820)]), observations: [observation(24, 820)], observationsStored: false,
  }));
  assert.equal(monitored.updates[0].alert.priceIntelligence.verdict, "Price history is building");
  assert.equal(monitored.updates[0].alert.buyWaitDecision.label, "HISTORY BUILDING");
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

test("target-reached events use a stable key so repeated checks cannot duplicate email", async () => {
  const alert = { ...createAlert(criteria, result([offer("start", 899)])), targetPrice: 900 };
  const first = await monitorAlertRecords([{ userId: "user-a", alert }], async () => result([offer("same", 899)]), "2026-08-25T12:00:00Z");
  const second = await monitorAlertRecords(
    [{ userId: "user-a", alert: { ...alert, targetNotifiedAtPrice: 900 } }],
    async () => result([offer("same", 899)]),
    "2026-08-25T13:00:00Z",
  );
  assert.equal(first.events.length, 1);
  assert.equal(second.events.length, 0);
  assert.match(first.events[0].eventKey, /target_reached\|900\|899/);
});

test("monitor emits target reached when an alert is already at target but has not been notified", async () => {
  const alert = {
    ...createAlert(criteria, result([offer("start", 1049.99)]), "2026-08-24T10:00:00Z"),
    targetPrice: 1100,
    currentPrice: 1049.99,
    trackedPrice: 1099.99,
  };
  const monitored = await monitorAlertRecords(
    [{ userId: "user-a", alert }],
    async () => result([offer("fresh", 1049.99)]),
    "2026-08-25T12:00:00Z",
  );
  assert.equal(monitored.events.length, 1);
  assert.equal(monitored.events[0].type, "target_reached");
  assert.equal(monitored.events[0].data.targetPrice, 1100);
  assert.equal(monitored.events[0].data.currentPrice, 1049.99);
});

test("monitor does not re-emit target reached after notification was recorded", async () => {
  const alert = {
    ...createAlert(criteria, result([offer("start", 1049.99)]), "2026-08-24T10:00:00Z"),
    targetPrice: 1100,
    currentPrice: 1049.99,
    trackedPrice: 1099.99,
    targetNotifiedAtPrice: 1100,
  };
  const monitored = await monitorAlertRecords(
    [{ userId: "user-a", alert }],
    async () => result([offer("fresh", 1049.99)]),
    "2026-08-25T12:00:00Z",
  );
  assert.equal(monitored.events.length, 0);
});
