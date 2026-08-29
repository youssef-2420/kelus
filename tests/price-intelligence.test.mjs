import assert from "node:assert/strict";
import test from "node:test";
import { calculatePriceIntelligence, exactRealPriceObservations } from "../services/price-intelligence.ts";

const variantId = "iphone-17-pro-256gb";
const day = 86_400_000;

function observation(index, total, options = {}) {
  const timestamp = new Date(Date.parse("2026-05-01T12:00:00.000Z") + index * day).toISOString();
  const shipping = Object.hasOwn(options, "shipping") ? options.shipping : 10;
  return {
    id: options.id ?? `observation-${index}-${total}`,
    offerId: options.offerId ?? `offer-${index}`,
    variantId: options.variantId ?? variantId,
    providerId: "ebay",
    retailerId: "ebay",
    price: total - (shipping ?? 0),
    shippingCost: shipping,
    condition: options.condition ?? "new",
    availability: "Unknown",
    timestamp: options.timestamp ?? timestamp,
    isDemo: options.isDemo ?? false,
  };
}

test("history stays building until seven distinct days span six days", () => {
  const sixDays = Array.from({ length: 6 }, (_, index) => observation(index, 100));
  const context = calculatePriceIntelligence(sixDays, { variantId, condition: "new" });
  assert.equal(context.currentTrustedPrice, 100);
  assert.equal(context.average30Day, null);
  assert.equal(context.recentLow, null);
  assert.equal(context.verdict, "Price history is building");
});

test("daily best totals drive 30-day context without counting every listing as a separate price", () => {
  const history = Array.from({ length: 7 }, (_, index) => observation(index, 100));
  history.push(observation(6, 80, { id: "same-snapshot-cheaper", offerId: "same-snapshot-cheaper" }));
  const context = calculatePriceIntelligence(history, { variantId, condition: "new" });
  assert.equal(context.currentTrustedPrice, 80);
  assert.equal(context.average30Day, 97.14);
  assert.equal(context.recentLow, 80);
  assert.equal(context.recentHigh, 100);
  assert.equal(context.trend, "falling");
  assert.equal(context.verdict, "Great price");
});

test("daily price intelligence keeps the lowest validated known total rather than the latest offer", () => {
  const observations = [
    observation(0, 820, { timestamp: "2026-08-01T09:00:00Z", variantId: "iphone-17-256" }),
    observation(0, 850, { timestamp: "2026-08-01T18:00:00Z", variantId: "iphone-17-256" }),
    ...Array.from({ length: 6 }, (_, index) => observation(index + 1, 820, { timestamp: `2026-08-${String(index + 2).padStart(2, "0")}T12:00:00Z`, variantId: "iphone-17-256" })),
  ];
  const context = calculatePriceIntelligence(observations, { variantId: "iphone-17-256", condition: "new" });
  assert.equal(context.historyStatus, "ready");
  assert.equal(context.average30Day, 820);
  assert.equal(context.recentLow, 820);
});

test("only real observations for the exact variant and condition are eligible", () => {
  const eligible = Array.from({ length: 7 }, (_, index) => observation(index, 100));
  const ignored = [
    observation(6, 1, { id: "demo", isDemo: true }),
    observation(6, 2, { id: "wrong-condition", condition: "used" }),
    observation(6, 3, { id: "wrong-variant", variantId: "iphone-17-pro-512gb" }),
    observation(6, 4, { id: "unknown-shipping", shipping: null }),
  ];
  const exact = exactRealPriceObservations([...eligible, ...ignored], { variantId, condition: "new" });
  assert.equal(exact.length, 7);
  assert.equal(calculatePriceIntelligence([...eligible, ...ignored], { variantId, condition: "new" }).currentTrustedPrice, 100);
});

test("verdict thresholds are deterministic against the 30-day daily-best average", () => {
  const verdict = (latest) => calculatePriceIntelligence([
    ...Array.from({ length: 6 }, (_, index) => observation(index, 100)),
    observation(6, latest),
  ], { variantId, condition: "new" }).verdict;
  assert.equal(verdict(80), "Great price");
  assert.equal(verdict(94), "Good price");
  assert.equal(verdict(100), "Typical");
  assert.equal(verdict(110), "Expensive");
});

test("90-day average requires thirty distinct days spanning sixty days", () => {
  const start = Date.parse("2026-01-01T12:00:00.000Z");
  const history = Array.from({ length: 30 }, (_, index) => observation(index, 120, {
    timestamp: new Date(start + index * (61 / 29) * day).toISOString(),
  }));
  const context = calculatePriceIntelligence(history, { variantId, condition: "new" });
  assert.equal(context.average30Day, 120);
  assert.equal(context.average90Day, 120);
  assert.equal(context.verdict, "Typical");
});
