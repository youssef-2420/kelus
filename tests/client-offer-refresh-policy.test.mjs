import assert from "node:assert/strict";
import test from "node:test";
import { clientOfferRefreshMode } from "../services/client-offer-refresh-policy.ts";

const result = (offers = [{}], refreshRecommended = false) => ({
  status: offers.length ? "SUCCESS" : "EMPTY",
  result: { offers, observations: [], observationsStored: false, failedProviders: [], connectedProviders: ["ebay"], isDemo: false, lastUpdated: "2026-08-29T00:00:00Z", refreshRecommended },
});

test("fresh server snapshots do not trigger a duplicate client provider request", () => {
  assert.equal(clientOfferRefreshMode(result(), 0), "none");
});

test("stale server snapshots refresh only after the browser becomes idle", () => {
  assert.equal(clientOfferRefreshMode(result([{}], true), 0), "idle");
});

test("missing, empty, failed, and explicit retry states fetch immediately", () => {
  assert.equal(clientOfferRefreshMode(undefined, 0), "immediate");
  assert.equal(clientOfferRefreshMode(result([], true), 0), "immediate");
  assert.equal(clientOfferRefreshMode({ status: "ERROR", message: "Unavailable" }, 0), "immediate");
  assert.equal(clientOfferRefreshMode(result(), 1), "immediate");
});
