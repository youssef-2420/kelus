import assert from "node:assert/strict";
import test from "node:test";
import { getBuyWaitDecision } from "../services/buy-wait-decision.ts";

const ready = {
  currentTrustedPrice: 100,
  average30Day: 100,
  average90Day: null,
  recentLow: 95,
  recentHigh: 110,
  trend: "stable",
  verdict: "Typical",
  isDemo: false,
  historyStatus: "ready",
  observationCount: 7,
};

test("HISTORY BUILDING never produces a buy or wait verdict without sufficient history", () => {
  const decision = getBuyWaitDecision({ ...ready, average30Day: null, recentLow: null, historyStatus: "building", verdict: "Price history is building" });
  assert.equal(decision.label, "HISTORY BUILDING");
  assert.match(decision.explanation, /not enough real stored price history/i);
});

test("BUY NOW requires a below-average price close to the recent low", () => {
  const decision = getBuyWaitDecision({ ...ready, currentTrustedPrice: 90, average30Day: 100, recentLow: 89 });
  assert.equal(decision.label, "BUY NOW");
  assert.equal(decision.explanation, "The current comparable price is 10% below the 30-day average and within 1% of the recent low.");
});

test("FAIR PRICE covers a current price near the historical average", () => {
  const decision = getBuyWaitDecision({ ...ready, currentTrustedPrice: 101, average30Day: 100, recentLow: 95 });
  assert.equal(decision.label, "FAIR PRICE");
  assert.equal(decision.explanation, "The current comparable price is 1% above the 30-day average and 6% above the recent low.");
});

test("CONSIDER WAITING identifies a price materially above the average or recent low", () => {
  const decision = getBuyWaitDecision({ ...ready, currentTrustedPrice: 110, average30Day: 100, recentLow: 90 });
  assert.equal(decision.label, "CONSIDER WAITING");
  assert.equal(decision.explanation, "The current comparable price is 10% above the 30-day average and 22% above the recent low.");
});
