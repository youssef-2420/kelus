import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import { readBundledProductIntelligenceSnapshot } from "./bundled-product-intelligence-snapshots.ts";
import { readProductIntelligenceSnapshot } from "./product-intelligence-snapshot-store.ts";
import { getKelusRuntimeEnvironment } from "./runtime-environment.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export async function resolveInitialProductIntelligence(criteria: SearchCriteria): Promise<ProductOfferLoadOutcome> {
  const startedAt = Date.now();
  const bundled = readBundledProductIntelligenceSnapshot(criteria);
  const environment = getKelusRuntimeEnvironment();
  let result = bundled;
  if (!result && environment?.DB) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      result = await Promise.race([
        readProductIntelligenceSnapshot(environment.DB, criteria).catch(() => null),
        new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), 500); }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  if (!result) {
    const outcome = { status: "ERROR", message: "Saved product intelligence is refreshing. Please try again shortly." } as const;
    console.info("[product-intelligence] initial_resolved", {
      source: "snapshot_unavailable",
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
    source: bundled ? "bundled_snapshot" : "d1_snapshot",
    status: outcome.status,
    durationMs: Date.now() - startedAt,
    offers: result.offers.length,
  });
  return outcome;
}
