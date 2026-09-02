import assert from "node:assert/strict";
import test from "node:test";
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey, priorityCatalogSnapshotTargets, rotateCatalogSnapshotTargets } from "../lib/catalog-snapshot-targets.ts";

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

test("each quota-safe refresh slot includes one rotating priority product", () => {
  const interval = 15 * 60 * 1_000;
  const start = Date.parse("2026-08-29T00:00:00.000Z");
  const priority = priorityCatalogSnapshotTargets();
  assert.equal(priority.length, 12);
  const priorityKeys = new Set(priority.map(catalogSnapshotTargetKey));
  const selectedPriority = Array.from({ length: priority.length }, (_, index) =>
    rotateCatalogSnapshotTargets(start + index * interval, 3).filter((target) => priorityKeys.has(catalogSnapshotTargetKey(target)))[0],
  );
  assert.equal(new Set(selectedPriority.map(catalogSnapshotTargetKey)).size, priority.length);
  assert.ok(selectedPriority.every(Boolean));
});
