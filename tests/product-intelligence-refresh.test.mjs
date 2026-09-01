import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { catalogRefreshCriteria, refreshPersistedProductIntelligenceSnapshots } from "../services/server-product-snapshot-refresh.ts";

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
  const result = await refreshPersistedProductIntelligenceSnapshots(
    { DB: database },
    fetch,
    Date.parse("2026-08-27T12:00:00.000Z"),
    async () => { throw new Error("eBay unavailable"); },
    { catalogCriteria: [] },
  );
  assert.equal(result.due, 1);
  assert.equal(result.refreshed, 0);
  assert.equal(result.empty, 0);
  assert.equal(result.failed, 1);
});

test("catalog refresh rotates through all configurations without duplicate identities", () => {
  const first = catalogRefreshCriteria(Date.parse("2026-08-29T00:00:00.000Z"));
  const second = catalogRefreshCriteria(Date.parse("2026-08-29T06:00:00.000Z"));
  const third = catalogRefreshCriteria(Date.parse("2026-08-29T12:00:00.000Z"));
  const fourth = catalogRefreshCriteria(Date.parse("2026-08-29T18:00:00.000Z"));
  const fifth = catalogRefreshCriteria(Date.parse("2026-08-30T00:00:00.000Z"));
  const sixth = catalogRefreshCriteria(Date.parse("2026-08-30T06:00:00.000Z"));
  const seventh = catalogRefreshCriteria(Date.parse("2026-08-30T12:00:00.000Z"));
  const eighth = catalogRefreshCriteria(Date.parse("2026-08-30T18:00:00.000Z"));
  const combined = [...first, ...second, ...third, ...fourth, ...fifth, ...sixth, ...seventh, ...eighth];
  assert.equal(first.length, 16);
  assert.equal(new Set(combined.map((criteria) => `${criteria.productSlug}:${criteria.variantId}:${criteria.condition}`)).size, 128);
  assert.ok(combined.every((criteria) => (criteria.condition === "new" || criteria.condition === "used") && criteria.market === "us"));
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
