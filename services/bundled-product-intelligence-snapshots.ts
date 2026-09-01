import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { catalogSnapshotTargetKey } from "../lib/catalog-snapshot-targets.ts";
import { applySnapshotTrustGate } from "./snapshot-trust.ts";
import snapshots from "../data/bundled-product-intelligence-snapshots.json" with { type: "json" };

const bundledSnapshots = snapshots as Record<string, OfferSearchResult>;

export function readBundledProductIntelligenceSnapshot(
  criteria: SearchCriteria,
  now = Date.now(),
): OfferSearchResult | null {
  const snapshot = bundledSnapshots[catalogSnapshotTargetKey(criteria)];
  if (!snapshot) return null;
  const trustedSnapshot = applySnapshotTrustGate(criteria, snapshot);
  if (!trustedSnapshot) return null;
  const fetchedAt = snapshot.lastUpdated ? Date.parse(snapshot.lastUpdated) : Number.NaN;
  const ageMs = Number.isNaN(fetchedAt) ? Number.POSITIVE_INFINITY : Math.max(0, now - fetchedAt);
  const snapshotState = ageMs > 7 * 24 * 60 * 60 * 1_000
    ? "expired" as const
    : ageMs > 5 * 60 * 1_000
      ? "stale" as const
      : "fresh" as const;
  return {
    ...trustedSnapshot,
    servedFromCache: true,
    refreshRecommended: snapshotState !== "fresh",
    snapshotState,
  };
}
