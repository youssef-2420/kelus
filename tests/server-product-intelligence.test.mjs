import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveInitialProductIntelligenceCacheFirst, resolveInitialProductIntelligenceWithLoader } from "../services/server-product-intelligence-core.ts";
import { resolveInitialProductIntelligence } from "../services/server-product-intelligence.ts";

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

test("server product intelligence serves persisted offers without waiting for eBay", async () => {
  let providerCalls = 0;
  const outcome = await resolveInitialProductIntelligenceCacheFirst(
    criteria,
    environment,
    async () => ({ ...result([{ id: "persisted-offer" }]), servedFromCache: true }),
    async () => { providerCalls += 1; return result([{ id: "live-offer" }]); },
    { persistedTimeoutMs: 20, providerTimeoutMs: 20 },
  );
  assert.equal(outcome.status, "SUCCESS");
  assert.equal(outcome.result.offers[0].id, "persisted-offer");
  assert.equal(providerCalls, 0);
});

test("server product intelligence bounds both a slow persisted read and provider fallback", async () => {
  const startedAt = Date.now();
  const outcome = await resolveInitialProductIntelligenceCacheFirst(
    criteria,
    environment,
    async () => new Promise(() => {}),
    async () => new Promise(() => {}),
    { persistedTimeoutMs: 5, providerTimeoutMs: 5 },
  );
  assert.equal(outcome.status, "ERROR");
  assert.ok(Date.now() - startedAt < 100, "request should terminate rather than inherit provider latency");
});

test("canonical initial HTML resolver has no live provider dependency", async () => {
  const source = await readFile(new URL("../services/server-product-intelligence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /getLiveOffersForSearch|EbayProvider/);
});

test("canonical initial HTML resolves from its bundled real snapshot without touching a stalled database", async () => {
  const statement = { bind() { return this; }, first() { return new Promise(() => {}); } };
  const startedAt = Date.now();
  const outcome = await resolveInitialProductIntelligence(criteria, { DB: { prepare: () => statement, batch: async () => [] } }, 5);
  assert.equal(outcome.status, "SUCCESS");
  assert.ok(outcome.result.offers.length > 0);
  assert.ok(Date.now() - startedAt < 100);
});

test("a canonical product without a bundled snapshot returns an immediate honest error", async () => {
  const outcome = await resolveInitialProductIntelligence({ ...criteria, productSlug: "iphone-17", variantId: "iphone-17-128" }, undefined);
  assert.equal(outcome.status, "ERROR");
});
