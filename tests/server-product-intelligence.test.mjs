import assert from "node:assert/strict";
import test from "node:test";
import { resolveInitialProductIntelligenceWithLoader } from "../services/server-product-intelligence-core.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const result = (offers) => ({ offers, observations: [], observationsStored: false, failedProviders: [], connectedProviders: ["ebay"], isDemo: false });
const environment = {};

test("server product intelligence returns SUCCESS for resolved offers", async () => {
  const outcome = await resolveInitialProductIntelligenceWithLoader(criteria, environment, async () => result([{ id: "offer-1" }]), 20);
  assert.equal(outcome.status, "SUCCESS");
});

test("server product intelligence returns EMPTY for zero exact matches", async () => {
  const outcome = await resolveInitialProductIntelligenceWithLoader(criteria, environment, async () => result([]), 20);
  assert.equal(outcome.status, "EMPTY");
});

test("server product intelligence returns ERROR on provider failure or timeout", async () => {
  const failure = await resolveInitialProductIntelligenceWithLoader(criteria, environment, async () => { throw new Error("Provider unavailable"); }, 20);
  assert.deepEqual(failure, { status: "ERROR", message: "Provider unavailable" });

  const timeout = await resolveInitialProductIntelligenceWithLoader(criteria, environment, async () => new Promise(() => {}), 5);
  assert.equal(timeout.status, "ERROR");
});
