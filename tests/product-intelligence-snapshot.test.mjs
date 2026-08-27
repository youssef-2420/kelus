import assert from "node:assert/strict";
import test from "node:test";
import {
  clearProductIntelligenceSnapshotMemory,
  productIntelligenceSnapshotKey,
  readProductIntelligenceSnapshot,
  storeProductIntelligenceSnapshot,
} from "../services/product-intelligence-snapshot-store.ts";

const criteria = { productSlug: "iphone-17-pro", variantId: "iphone-17-pro-256gb", condition: "new", market: "us" };
const fetchedAt = "2026-08-27T09:00:00.000Z";
const liveResult = {
  offers: [{ id: "ebay-1", dataSource: "live" }],
  observations: [{ id: "observation-1" }],
  observationsStored: true,
  failedProviders: [],
  connectedProviders: ["ebay"],
  isDemo: false,
  lastUpdated: fetchedAt,
};

class FakeStatement {
  constructor(database, sql) { this.database = database; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() {
    this.database.row = { result_json: this.args[5], fetched_at: this.args[6] };
    this.database.writes += 1;
    return {};
  }
  async first() { return this.database.row; }
}

class FakeSnapshotDatabase {
  constructor() { this.row = null; this.writes = 0; }
  prepare(sql) { return new FakeStatement(this, sql); }
}

test("offer snapshots use exact product, variant, condition, and market identity", () => {
  assert.equal(productIntelligenceSnapshotKey(criteria), "iphone-17-pro:iphone-17-pro-256gb:new:us");
});

test("live offer snapshots persist primary content without duplicating observation history", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  assert.equal(await storeProductIntelligenceSnapshot(database, "apple-iphone-17-pro", criteria, liveResult), true);
  assert.equal(database.writes, 1);
  const restored = await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  });
  assert.equal(restored.offers[0].id, "ebay-1");
  assert.deepEqual(restored.observations, []);
  assert.equal(restored.observationsStored, false);
  assert.equal(restored.servedFromCache, true);
  assert.equal(restored.refreshRecommended, false);
});

test("expired or malformed snapshots never become product intelligence", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  database.row = { result_json: JSON.stringify(liveResult), fetched_at: fetchedAt };
  assert.equal(await readProductIntelligenceSnapshot(database, criteria, {
    maximumAgeMs: 1_000,
    now: () => Date.parse("2026-08-27T10:00:00.000Z"),
  }), null);
  database.row = { result_json: "not-json", fetched_at: fetchedAt };
  clearProductIntelligenceSnapshotMemory();
  assert.equal(await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  }), null);
});

test("an honest zero-offer result is persisted as an EMPTY terminal state", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  assert.equal(await storeProductIntelligenceSnapshot(database, "apple-iphone-17-pro", criteria, { ...liveResult, offers: [] }), true);
  const restored = await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  });
  assert.deepEqual(restored.offers, []);
});
