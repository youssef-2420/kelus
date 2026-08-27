import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import { resolveInitialProductIntelligenceCacheFirst } from "./server-product-intelligence-core.ts";
import { getLiveOffersForSearch } from "./server-offer-service.ts";
import type { LiveOfferEnvironment } from "./server-offer-service.ts";
import { readLivePriceObservations } from "./price-observation-store.ts";
import { readProductIntelligenceSnapshot } from "./product-intelligence-snapshot-store.ts";
import { getProductBySlug } from "../lib/demo-data.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export async function resolveInitialProductIntelligence(
  criteria: SearchCriteria,
  environment: LiveOfferEnvironment | undefined,
  providerTimeoutMs = 1_500,
): Promise<ProductOfferLoadOutcome> {
  const startedAt = Date.now();
  let source = "provider";
  const outcome = await resolveInitialProductIntelligenceCacheFirst(
    criteria,
    environment,
    async () => {
      if (!environment?.DB) return null;
      const snapshot = await readProductIntelligenceSnapshot(environment.DB, criteria);
      if (!snapshot) return null;
      source = "persisted_d1";
      const canonicalProductId = getProductBySlug(criteria.productSlug)?.id;
      if (!canonicalProductId) return snapshot;
      try {
        const observations = await readLivePriceObservations(
          environment.DB,
          canonicalProductId,
          criteria.variantId ?? "",
          criteria.condition,
          500,
          false,
        );
        return { ...snapshot, observations, observationsStored: observations.length > 0 };
      } catch {
        return snapshot;
      }
    },
    getLiveOffersForSearch,
    { persistedTimeoutMs: 500, providerTimeoutMs },
  );
  console.info("[product-intelligence] initial_resolved", {
    source,
    status: outcome.status,
    durationMs: Date.now() - startedAt,
    offers: outcome.status === "ERROR" ? 0 : outcome.result.offers.length,
  });
  return outcome;
}
