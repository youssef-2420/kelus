import assert from "node:assert/strict";
import test from "node:test";
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey, rotateCatalogSnapshotTargets } from "../lib/catalog-snapshot-targets.ts";

test("catalog snapshot targets cover every indexed variant in new and used conditions", () => {
  const targets = allCatalogSnapshotTargets();
  assert.equal(targets.length, 172);
  assert.ok(targets.every((criteria) => (criteria.condition === "new" || criteria.condition === "used") && criteria.market === "us"));
  assert.equal(new Set(targets.map(catalogSnapshotTargetKey)).size, targets.length);
});

test("catalog snapshot rotation walks the full indexed catalog without duplicates", () => {
  const batch = rotateCatalogSnapshotTargets(Date.parse("2026-08-29T00:00:00.000Z"), 16);
  assert.equal(batch.length, 16);
  assert.equal(new Set(batch.map(catalogSnapshotTargetKey)).size, 16);
  assert.equal(allCatalogSnapshotTargets().length, 172);
});
