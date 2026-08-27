import { settleProductOfferLoad, type ProductOfferLoadOutcome } from "./product-offer-load.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";

type LiveOfferLoader<Environment> = (criteria: SearchCriteria, environment: Environment) => Promise<OfferSearchResult>;

const unavailableMessage = "Live offers are unavailable in this environment.";

export async function resolveInitialProductIntelligenceWithLoader<Environment>(
  criteria: SearchCriteria,
  environment: Environment | undefined,
  load: LiveOfferLoader<Environment>,
  timeoutMs = 18_000,
): Promise<ProductOfferLoadOutcome> {
  if (!environment) return { status: "ERROR", message: unavailableMessage };
  return settleProductOfferLoad(load(criteria, environment), timeoutMs);
}
