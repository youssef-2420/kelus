import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalogRefreshCriteria, refreshPersistedProductIntelligenceSnapshots } from "../services/server-product-snapshot-refresh.ts";
import { allCatalogSnapshotTargets } from "../lib/catalog-snapshot-targets.ts";
import { EbayProviderError } from "../services/providers/ebay/provider.ts";

class DueStatement {
  constructor(rows) { this.rows = rows; }
  bind() { return this; }
  async all() { return { results: this.rows }; }
}

test("scheduled snapshot refresh deduplicates canonical configurations", async () => {
  const row = {
    cache_key: "iphone-17-pro:iphone-17-pro-256gb:new:us",
    variant_id: "iphone-17-pro-256gb",
    condition: "new",
    market: "us",
  };
  const database = { prepare: () => new DueStatement([row, row]) };
  const searched = [];
  const result = await refreshPersistedProductIntelligenceSnapshots(
    { DB: database },
    fetch,
    Date.parse("2026-08-27T12:00:00.000Z"),
    async (criteria) => {
      searched.push(criteria);
      return { offers: [{ id: "offer-1" }], observations: [], failedProviders: [], isDemo: false };
    },
    { catalogCriteria: [] },
  );
  assert.equal(searched.length, 1);
  assert.equal(result.due, 1);
  assert.equal(result.catalogQueued, 0);
  assert.equal(result.staleQueued, 1);
  assert.equal(result.refreshed, 1);
  assert.equal(result.empty, 0);
  assert.equal(result.failed, 0);
});

test("scheduled snapshot refresh isolates provider failures", async () => {
  const database = { prepare: () => new DueStatement([{
    cache_key: "iphone-17-pro:iphone-17-pro-256gb:new:us",
    variant_id: "iphone-17-pro-256gb",
    condition: "new",
    market: "us",
  }]) };
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...values) => warnings.push(values);
  try {
    const result = await refreshPersistedProductIntelligenceSnapshots(
      { DB: database },
      fetch,
      Date.parse("2026-08-27T12:00:00.000Z"),
      async () => { throw new EbayProviderError("eBay quota reached", "rate_limited", 429); },
      { catalogCriteria: [] },
    );
    assert.equal(result.due, 1);
    assert.equal(result.refreshed, 0);
    assert.equal(result.empty, 0);
    assert.equal(result.failed, 1);
  } finally {
    console.warn = originalWarn;
  }
  const failure = warnings.find(([event]) => event === "[product-intelligence] catalog_refresh_failed");
  assert.ok(failure);
  assert.deepEqual(failure[1], {
    productSlug: "iphone-17-pro",
    variantId: "iphone-17-pro-256gb",
    condition: "new",
    code: "rate_limited",
    message: "eBay quota reached",
  });
});

test("catalog refresh rotates through all configurations without duplicate identities", () => {
  const batch = catalogRefreshCriteria(Date.parse("2026-08-29T00:00:00.000Z"));
  assert.equal(batch.length, 16);
  assert.equal(new Set(batch.map((criteria) => `${criteria.productSlug}:${criteria.variantId}:${criteria.condition}`)).size, 16);
  assert.equal(allCatalogSnapshotTargets().length, 172);
  assert.ok(batch.every((criteria) => (criteria.condition === "new" || criteria.condition === "used") && criteria.market === "us"));
});

test("the deployed alert-monitor schedule starts snapshot refresh out of band", async () => {
  const [workerSource, migrationSource] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202608250002_price_alert_monitoring.sql", import.meta.url), "utf8"),
  ]);
  assert.match(migrationSource, /https:\/\/kelus\.me\/api\/alerts\/check/);
  assert.match(workerSource, /ctx\.waitUntil\(refreshPersistedProductIntelligenceSnapshots/);
  assert.match(workerSource, /const result = await runAlertMonitor[\s\S]*ctx\.waitUntil/);
});
