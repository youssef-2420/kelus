import assert from "node:assert/strict";
import test from "node:test";
import { historyPointsFromObservations } from "../lib/price-history-points.ts";

test("historyPointsFromObservations builds daily best totals for a configuration", () => {
  const points = historyPointsFromObservations([
    { id: "1", offerId: "o1", variantId: "iphone-17-pro-256gb", providerId: "ebay", retailerId: "ebay", price: 1049, shippingCost: 0, condition: "new", availability: "In stock", timestamp: "2026-08-20T12:00:00Z", isDemo: false },
    { id: "2", offerId: "o2", variantId: "iphone-17-pro-256gb", providerId: "ebay", retailerId: "ebay", price: 1039, shippingCost: 0, condition: "new", availability: "In stock", timestamp: "2026-08-21T12:00:00Z", isDemo: false },
    { id: "3", offerId: "o3", variantId: "iphone-17-pro-256gb", providerId: "ebay", retailerId: "ebay", price: 1045, shippingCost: 0, condition: "new", availability: "In stock", timestamp: "2026-08-21T18:00:00Z", isDemo: false },
  ], { variantId: "iphone-17-pro-256gb", condition: "new" });
  assert.deepEqual(points, [
    { label: "08-20", price: 1049 },
    { label: "08-21", price: 1039 },
  ]);
});
