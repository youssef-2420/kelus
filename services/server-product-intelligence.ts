import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import { resolveInitialProductIntelligenceWithLoader } from "./server-product-intelligence-core.ts";
import { getLiveOffersForSearch } from "./server-offer-service.ts";
import type { LiveOfferEnvironment } from "./server-offer-service.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export async function resolveInitialProductIntelligence(
  criteria: SearchCriteria,
  environment: LiveOfferEnvironment | undefined,
  timeoutMs = 18_000,
): Promise<ProductOfferLoadOutcome> {
  return resolveInitialProductIntelligenceWithLoader(criteria, environment, getLiveOffersForSearch, timeoutMs);
}
