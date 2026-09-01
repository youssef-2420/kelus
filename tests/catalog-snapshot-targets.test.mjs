import assert from "node:assert/strict";
import test from "node:test";
import { allCatalogSnapshotTargets, catalogSnapshotTargetKey, rotateCatalogSnapshotTargets } from "../lib/catalog-snapshot-targets.ts";

test("catalog snapshot targets cover every indexed variant in new and used conditions", () => {
  const targets = allCatalogSnapshotTargets();
  assert.equal(targets.length, 128);
  assert.ok(targets.every((criteria) => (criteria.condition === "new" || criteria.condition === "used") && criteria.market === "us"));
  assert.equal(new Set(targets.map(catalogSnapshotTargetKey)).size, targets.length);
});

test("catalog snapshot rotation walks the full indexed catalog without duplicates", () => {
  const first = rotateCatalogSnapshotTargets(Date.parse("2026-08-29T00:00:00.000Z"), 16);
  const second = rotateCatalogSnapshotTargets(Date.parse("2026-08-29T06:00:00.000Z"), 16);
  const third = rotateCatalogSnapshotTargets(Date.parse("2026-08-29T12:00:00.000Z"), 16);
  const fourth = rotateCatalogSnapshotTargets(Date.parse("2026-08-29T18:00:00.000Z"), 16);
  const fifth = rotateCatalogSnapshotTargets(Date.parse("2026-08-30T00:00:00.000Z"), 16);
  const sixth = rotateCatalogSnapshotTargets(Date.parse("2026-08-30T06:00:00.000Z"), 16);
  const seventh = rotateCatalogSnapshotTargets(Date.parse("2026-08-30T12:00:00.000Z"), 16);
  const eighth = rotateCatalogSnapshotTargets(Date.parse("2026-08-30T18:00:00.000Z"), 16);
  const combined = [...first, ...second, ...third, ...fourth, ...fifth, ...sixth, ...seventh, ...eighth];
  assert.equal(first.length, 16);
  assert.equal(new Set(combined.map(catalogSnapshotTargetKey)).size, 128);
});
