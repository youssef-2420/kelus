import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import { readBundledProductIntelligenceSnapshot } from "./bundled-product-intelligence-snapshots.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export async function resolveInitialProductIntelligence(criteria: SearchCriteria): Promise<ProductOfferLoadOutcome> {
  const startedAt = Date.now();
  const result = readBundledProductIntelligenceSnapshot(criteria);
  if (!result) {
    const outcome = { status: "ERROR", message: "Saved product intelligence is refreshing. Please try again shortly." } as const;
    console.info("[product-intelligence] initial_resolved", {
      source: "bundled_unavailable",
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
    source: "bundled_snapshot",
    status: outcome.status,
    durationMs: Date.now() - startedAt,
    offers: result.offers.length,
  });
  return outcome;
}
