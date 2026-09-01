import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import { readBundledProductIntelligenceSnapshot } from "./bundled-product-intelligence-snapshots.ts";
import { readProductIntelligenceSnapshot } from "./product-intelligence-snapshot-store.ts";
import { getKelusRuntimeEnvironment } from "./runtime-environment.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";

function snapshotTime(result: OfferSearchResult | null) {
  const value = result?.lastUpdated ? Date.parse(result.lastUpdated) : Number.NaN;
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

export async function resolveInitialProductIntelligence(
  criteria: SearchCriteria,
  environmentOverride = getKelusRuntimeEnvironment(),
  persistedTimeoutMs = 500,
): Promise<ProductOfferLoadOutcome> {
  const startedAt = Date.now();
  const bundled = readBundledProductIntelligenceSnapshot(criteria);
  const environment = environmentOverride;
  let persisted: OfferSearchResult | null = null;
  if (environment?.DB) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      persisted = await Promise.race([
        readProductIntelligenceSnapshot(environment.DB, criteria).catch(() => null),
        new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), persistedTimeoutMs); }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  const result = persisted && (!bundled || snapshotTime(persisted) >= snapshotTime(bundled)) ? persisted : bundled;
  const source = result === persisted ? "d1_snapshot" : result === bundled ? "bundled_snapshot" : "snapshot_not_yet_available";
  if (!result) {
    const outcome: ProductOfferLoadOutcome = {
      status: "EMPTY",
      result: {
        offers: [],
        observations: [],
        observationsStored: false,
        failedProviders: [],
        connectedProviders: ["ebay"],
        isDemo: false,
        refreshRecommended: true,
      },
    };
    console.info("[product-intelligence] initial_resolved", {
      source,
      status: outcome.status,
      durationMs: Date.now() - startedAt,
      offers: 0,
    });
    return outcome;
  }
  const outcome: ProductOfferLoadOutcome = result.offers.length
    ? { status: "SUCCESS", result }
    : { status: "EMPTY", result };
  console.info("[product-intelligence] initial_resolved", {
    source,
    status: outcome.status,
    durationMs: Date.now() - startedAt,
    offers: result.offers.length,
  });
  return outcome;
}
