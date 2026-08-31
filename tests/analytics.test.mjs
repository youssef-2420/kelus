import assert from "node:assert/strict";
import test from "node:test";
import { readStoredAnalyticsEvents, readUnsupportedSearches, trackEvent } from "../services/analytics.ts";

function installStorage() {
  const store = new Map();
  const googleEvents = [];
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
    },
    gtag: (...args) => { googleEvents.push(args); },
  };
  return googleEvents;
}

test("analytics records core funnel events without sensitive payloads", () => {
  const googleEvents = installStorage();
  trackEvent({ name: "landing_viewed" });
  trackEvent({ name: "search_submitted", productSlug: "macbook-pro-16-m4", query: "MacBook Pro 16 1TB" });
  trackEvent({ name: "product_page_viewed", productSlug: "macbook-pro-16-m4", variantId: "macbook-pro-16-m4-max-36-1tb", condition: "used" });
  trackEvent({ name: "recommendation_viewed", productSlug: "iphone-17-pro", offerId: "ebay-v1|1|0", confidence: "MEDIUM" });
  trackEvent({ name: "retailer_clicked", offerId: "ebay-v1|1|0" });
  trackEvent({ name: "price_alert_created", product: "iPhone 17 Pro" });
  const names = readStoredAnalyticsEvents().map((event) => event.name);
  assert.deepEqual(names, ["landing_viewed", "search_submitted", "product_page_viewed", "recommendation_viewed", "retailer_clicked", "price_alert_created"]);
  assert.equal(JSON.stringify(readStoredAnalyticsEvents()).includes("@"), false);
  assert.equal(googleEvents.length, 6);
  assert.deepEqual(googleEvents[1], ["event", "search_submitted", { productSlug: "macbook-pro-16-m4" }]);
});

test("unsupported searches are normalized for catalog prioritization", () => {
  installStorage();
  trackEvent({ name: "search_unsupported", query: "  Dyson  Headphones!!! " });
  assert.deepEqual(readUnsupportedSearches(), ["dyson headphones"]);
});
