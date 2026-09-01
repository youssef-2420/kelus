import assert from "node:assert/strict";
import test from "node:test";
import { authorizeDiagnostics, getAnalyticsDiagnostics } from "../services/analytics-diagnostics.ts";

const resultSets = [
  [{ label: "landing_viewed", count: 100 }, { label: "search_submitted", count: 50 }, { label: "product_page_viewed", count: 40 }, { label: "recommendation_viewed", count: 30 }, { label: "retailer_clicked", count: 6 }, { label: "price_alert_created", count: 4 }, { label: "search_unsupported", count: 5 }, { label: "product_interest_captured", count: 2 }],
  [{ label: "iphone-17-pro", count: 12 }],
  [{ label: "dyson headphones", count: 3 }],
  [{ label: "steam deck", count: 2 }],
  [{ label: "Zero valid offers", count: 2 }],
  [],
];
const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: resultSets.shift() }) }) }) };

test("diagnostics calculate factual funnel rates and preserve ranked rows", async () => {
  const report = await getAnalyticsDiagnostics(db, new Date("2026-08-30T12:00:00Z"));
  assert.equal(report.funnel.retailerClickRate, 20);
  assert.equal(report.funnel.alertConversionRate, 10);
  assert.equal(report.funnel.interestCaptureRate, 40);
  assert.equal(report.topProducts[0].label, "iphone-17-pro");
  assert.equal(report.unsupportedSearches[0].label, "dyson headphones");
  assert.equal(report.productInterestRequests[0].label, "steam deck");
  assert.equal(report.recommendationQuality[0].status, "FAIL");
  assert.match(report.recommendationQuality[0].reasons[0], /No persisted offer snapshot/);
});

test("diagnostics require the exact operations secret", () => {
  assert.equal(authorizeDiagnostics(new Request("https://kelus.me", { headers: { Authorization: "Bearer correct" } }), "correct"), true);
  assert.equal(authorizeDiagnostics(new Request("https://kelus.me", { headers: { Authorization: "Bearer wrong" } }), "correct"), false);
  assert.equal(authorizeDiagnostics(new Request("https://kelus.me"), "correct"), false);
});
