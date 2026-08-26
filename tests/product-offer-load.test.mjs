import assert from "node:assert/strict";
import test from "node:test";
import { settleProductOfferLoad } from "../services/product-offer-load.ts";

const result = (offers) => ({ offers, observations: [], observationsStored: false, failedProviders: [], connectedProviders: ["ebay"], isDemo: false });

test("product offer loading ends in SUCCESS when normalized offers exist", async () => {
  const outcome = await settleProductOfferLoad(Promise.resolve(result([{ id: "offer-1" }])), 20);
  assert.equal(outcome.status, "SUCCESS");
});

test("product offer loading ends in EMPTY when matching returns no offers", async () => {
  const outcome = await settleProductOfferLoad(Promise.resolve(result([])), 20);
  assert.equal(outcome.status, "EMPTY");
});

test("product offer loading ends in ERROR for provider failure", async () => {
  const outcome = await settleProductOfferLoad(Promise.reject(new Error("Provider unavailable")), 20);
  assert.deepEqual(outcome, { status: "ERROR", message: "Provider unavailable" });
});

test("product offer loading ends in ERROR when a request never settles", async () => {
  const outcome = await settleProductOfferLoad(new Promise(() => {}), 5);
  assert.deepEqual(outcome, { status: "ERROR", message: "The live search took too long. Please try again." });
});
