import assert from "node:assert/strict";
import test from "node:test";
import { bestLiveOffer, comparisonHref, createAlert, getAlertStatus, getDistanceFromTarget, getPriceChange, updateAlertFromError, updateAlertFromResult } from "../services/price-alerts.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const offer = (id, price, shippingCost, extra = {}) => ({
  id, productId: "apple-iphone-17-pro", variantId: "iphone-17-pro-256gb",
  retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" },
  seller: { id: "seller", retailerId: "ebay", name: "Seller", sellerType: "marketplace_seller" },
  price, shippingCost, shippingCostKnown: true, currency: "USD", condition: "new", delivery: "", availability: "In stock", warranty: "", returnPolicy: "30-day returns",
  affiliateUrl: `https://www.ebay.com/itm/${id}`, lastUpdated: "2026-08-25T10:00:00Z", dataSource: "live", imageUrl: "https://example.com/product.jpg", ...extra,
});
const result = (offers) => ({ offers, observations: [], failedProviders: [], isDemo: false, lastUpdated: "2026-08-25T10:00:00Z" });

test("best live price compares item plus known shipping", () => {
  assert.equal(bestLiveOffer([offer("cheap-item", 800, 50), offer("best-total", 825, 0)])?.id, "best-total");
  assert.equal(bestLiveOffer([offer("unknown", 700, 0, { shippingCostKnown: false }), offer("known", 830, 0)])?.id, "known");
});

test("a new alert starts from a real price without inventing a change", () => {
  const alert = createAlert(criteria, result([offer("one", 829, 0)]), "2026-08-25T10:01:00Z");
  assert.ok(alert);
  assert.equal(alert.trackedPrice, 829);
  assert.equal(alert.currentPrice, 829);
  assert.deepEqual(getPriceChange(alert), { amount: 0, percent: 0 });
  assert.equal(getAlertStatus(alert), "watching");
});

test("new live prices update change and target status while preserving baseline", () => {
  const initial = createAlert(criteria, result([offer("one", 899, 0)]), "2026-08-24T10:00:00Z");
  const updated = updateAlertFromResult({ ...initial, targetPrice: 829 }, result([offer("two", 820, 4)]), "2026-08-25T10:00:00Z");
  assert.equal(updated.trackedPrice, 899);
  assert.equal(updated.currentPrice, 824);
  assert.deepEqual(getPriceChange(updated), { amount: -75, percent: -8.3 });
  assert.equal(getDistanceFromTarget(updated), 0);
  assert.equal(getAlertStatus(updated), "target_reached");
});

test("empty and failed refreshes retain the last real price", () => {
  const initial = createAlert(criteria, result([offer("one", 829, 0)]));
  const unavailable = updateAlertFromResult(initial, result([]));
  assert.equal(unavailable.currentPrice, 829);
  assert.equal(unavailable.state, "unavailable");
  const failed = updateAlertFromError(initial, "Provider unavailable");
  assert.equal(failed.currentPrice, 829);
  assert.equal(failed.state, "error");
});

test("comparison link restores canonical product configuration and condition", () => {
  const alert = createAlert(criteria, result([offer("one", 829, 0)]));
  const url = new URL(comparisonHref(alert), "https://kelus.me");
  assert.equal(url.pathname, "/results-v2");
  assert.deepEqual(Object.fromEntries(url.searchParams), { product: "iphone-17-pro", condition: "new", market: "us", variant: "iphone-17-pro-256gb" });
});
