import assert from "node:assert/strict";
import test from "node:test";
import {
  clearProductIntelligenceSnapshotMemory,
  listProductIntelligenceSnapshotsDue,
  productIntelligenceSnapshotKey,
  readProductIntelligenceSnapshot,
  staleSnapshotAfterRefresh,
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
    if (/^UPDATE/i.test(this.sql.trim())) this.database.row = { ...this.database.row, result_json: this.args[0] };
    else this.database.row = { result_json: this.args[5], fetched_at: this.args[6] };
    this.database.writes += 1;
    return {};
  }
  async first() { return this.database.row; }
  async all() { return { results: this.database.dueRows }; }
}

class FakeSnapshotDatabase {
  constructor() { this.row = null; this.writes = 0; this.dueRows = []; }
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
  assert.equal(restored.snapshotState, "fresh");
});

test("stale and expired valid snapshots remain available and request refresh", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  database.row = { result_json: JSON.stringify(liveResult), fetched_at: fetchedAt };
  const stale = await readProductIntelligenceSnapshot(database, criteria, {
    refreshAgeMs: 1_000,
    maximumAgeMs: 60 * 60 * 1_000,
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  });
  assert.equal(stale.snapshotState, "stale");
  assert.equal(stale.offers[0].id, "ebay-1");
  const expired = await readProductIntelligenceSnapshot(database, criteria, {
    maximumAgeMs: 1_000,
    now: () => Date.parse("2026-08-27T10:00:00.000Z"),
  });
  assert.equal(expired.snapshotState, "expired");
  assert.equal(expired.offers[0].id, "ebay-1");
});

test("malformed snapshots never become product intelligence", async () => {
  const database = new FakeSnapshotDatabase();
  database.row = { result_json: "not-json", fetched_at: fetchedAt };
  clearProductIntelligenceSnapshotMemory();
  assert.equal(await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  }), null);
});

test("a failed refresh keeps the last valid snapshot and marks it stale", () => {
  const fallback = staleSnapshotAfterRefresh(liveResult, "failed", "2026-08-27T09:05:00.000Z");
  assert.equal(fallback.offers[0].id, "ebay-1");
  assert.equal(fallback.snapshotState, "stale");
  assert.equal(fallback.lastRefreshFailed, true);
  assert.equal(fallback.refreshRecommended, true);
});

test("an empty refresh never overwrites a prior valid snapshot", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  await storeProductIntelligenceSnapshot(database, "apple-iphone-17-pro", criteria, liveResult);
  assert.equal(await storeProductIntelligenceSnapshot(database, "apple-iphone-17-pro", criteria, {
    ...liveResult,
    offers: [],
    lastUpdated: "2026-08-27T09:05:00.000Z",
  }), false);
  const restored = await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:06:00.000Z"),
  });
  assert.equal(restored.offers[0].id, "ebay-1");
  assert.equal(restored.lastRefreshReturnedEmpty, true);
});

test("a first-ever successful no-data refresh persists an honest EMPTY state", async () => {
  clearProductIntelligenceSnapshotMemory();
  const database = new FakeSnapshotDatabase();
  assert.equal(await storeProductIntelligenceSnapshot(database, "apple-iphone-17-pro", criteria, { ...liveResult, offers: [] }), true);
  const restored = await readProductIntelligenceSnapshot(database, criteria, {
    now: () => Date.parse("2026-08-27T09:02:00.000Z"),
  });
  assert.deepEqual(restored.offers, []);
});

test("scheduled refresh identities are deduplicated from persisted cache keys", async () => {
  const database = new FakeSnapshotDatabase();
  database.dueRows = [
    { cache_key: "iphone-17-pro:iphone-17-pro-256gb:new:us", variant_id: "iphone-17-pro-256gb", condition: "new", market: "us" },
    { cache_key: "iphone-17-pro:iphone-17-pro-256gb:new:us", variant_id: "iphone-17-pro-256gb", condition: "new", market: "us" },
  ];
  const due = await listProductIntelligenceSnapshotsDue(database, "2026-08-27T09:00:00.000Z");
  assert.equal(due.length, 1);
  assert.deepEqual(due[0], criteria);
});
