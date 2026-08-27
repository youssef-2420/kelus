import assert from "node:assert/strict";
import test from "node:test";
import { refreshPersistedProductIntelligenceSnapshots } from "../services/server-product-snapshot-refresh.ts";

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
  );
  assert.equal(searched.length, 1);
  assert.deepEqual(result, { due: 1, refreshed: 1, empty: 0, failed: 0 });
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
  );
  assert.deepEqual(result, { due: 1, refreshed: 0, empty: 0, failed: 1 });
});
