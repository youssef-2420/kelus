import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import { canonicalProductPath, readCanonicalProductSlug, validateSearchCriteria } from "../lib/search-state.ts";
import { monitorAlertRecords } from "../services/alert-monitor.ts";
import { getBuyWaitDecision } from "../services/buy-wait-decision.ts";
import { getPriceContext } from "../services/price-context.ts";
import { createAlert } from "../services/price-alerts.ts";
import { normalizeEbayItem, observationForEbayOffer } from "../services/providers/ebay/normalize.ts";
import { applyEbayPriceAnomalyDetection, validateEbayCandidate } from "../services/providers/ebay/trust-engine.ts";
import { getRecommendation } from "../services/recommendations.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const product = getProductBySlug(criteria.productSlug);
const variant = getVariantById(criteria.variantId);
const item = (id, price, shipping = 0, extra = {}) => ({
  itemId: `v1|${id}|0`, legacyItemId: id, title: "Apple iPhone 17 Pro 256GB Unlocked Brand New", shortDescription: "Apple smartphone 256GB",
  price: { value: String(price), currency: "USD" }, condition: "New", conditionId: "1000", buyingOptions: ["FIXED_PRICE"],
  categories: [{ categoryId: "9355", categoryName: "Cell Phones & Smartphones" }], itemWebUrl: `https://www.ebay.com/itm/${id}`,
  seller: { username: `seller-${id}`, feedbackPercentage: "99.8", feedbackScore: 2400 },
  localizedAspects: [{ name: "Model", value: "Apple iPhone 17 Pro" }, { name: "Storage Capacity", value: "256 GB" }, { name: "Lock Status", value: "Factory Unlocked" }],
  shippingOptions: [{ shippingCost: { value: String(shipping), currency: "USD" } }],
  returnTerms: { returnsAccepted: true, returnPeriod: { value: 30, unit: "DAY" }, returnShippingCostPayer: "SELLER" },
  ...extra,
});

test("complete search to canonical product, recommendation, and authenticated tracking flow uses only exact live data", async () => {
  assert.ok(product && variant);
  const valid = validateSearchCriteria(criteria);
  assert.ok(valid);
  const path = canonicalProductPath(valid);
  assert.equal(path, "/product/iphone-17-pro-256gb-new");
  assert.deepEqual(readCanonicalProductSlug(path.replace("/product/", "")), criteria);

  const candidates = [
    item("our-pick", 820, 9),
    item("cheaper", 810, 0, { seller: { username: "weaker", feedbackPercentage: "93", feedbackScore: 10 }, returnTerms: { returnsAccepted: false } }),
    item("accessory", 19, 0, { title: "Case for Apple iPhone 17 Pro 256GB" }),
    item("wrong-storage", 700, 0, { title: "Apple iPhone 17 Pro 512GB Unlocked", shortDescription: "" }),
  ];
  const offers = applyEbayPriceAnomalyDetection(candidates.flatMap((candidate) => {
    const validation = validateEbayCandidate(candidate, product, variant, criteria.condition);
    if (!validation.accepted) return [];
    const offer = normalizeEbayItem(candidate, product, variant, "2026-08-26T12:00:00Z");
    return offer ? [{ offer, validation }] : [];
  }));
  assert.equal(offers.length, 2);
  assert.equal(offers.every((offer) => offer.dataSource === "live" && offer.variantId === criteria.variantId), true);

  const recommendation = getRecommendation(offers, "kelus_pick");
  assert.equal(recommendation?.offerId, "ebay-v1|our-pick|0");
  assert.deepEqual(recommendation?.reasons, ["$829 total including shipping", "99.8% eBay feedback", "30-day seller returns · Seller-paid return shipping"]);

  const observations = Array.from({ length: 7 }, (_, index) => ({
    ...observationForEbayOffer(offers[0]),
    id: `observation-${index}`,
    timestamp: `2026-08-${String(20 + index).padStart(2, "0")}T12:00:00Z`,
    price: index === 6 ? 820 : 880,
  }));
  const context = getPriceContext(criteria, observations);
  assert.equal(context.historyStatus, "ready");
  assert.equal(getBuyWaitDecision(context).label, "BUY NOW");

  const result = { offers, observations, observationsStored: true, failedProviders: [], connectedProviders: ["ebay"], isDemo: false, lastUpdated: "2026-08-26T12:00:00Z" };
  const alert = createAlert(criteria, result, "2026-08-26T12:01:00Z");
  assert.ok(alert);
  assert.equal(alert.currentPrice, 810);
  const monitored = await monitorAlertRecords([{ userId: "authenticated-user", alert }], async () => result, "2026-08-26T18:00:00Z");
  assert.equal(monitored.searchedConfigurations, 1);
  assert.equal(monitored.updates[0].alert.criteria.variantId, criteria.variantId);
  assert.equal(monitored.updates[0].alert.buyWaitDecision.label, "BUY NOW");
});

test("Supabase observation storage is server-only and deduplicates provider observations", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202608260003_price_observations.sql", import.meta.url), "utf8");
  assert.match(migration, /unique \(provider_id, offer_id, observed_at\)/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* from anon, authenticated/i);
  assert.doesNotMatch(migration, /grant .*authenticated/i);
});
