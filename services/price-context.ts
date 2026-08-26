import type { PriceObservation, SearchCriteria } from "@/types/kelus";
import { calculatePriceIntelligence } from "./price-intelligence.ts";

export function getPriceContext(criteria: SearchCriteria, observations: PriceObservation[]) {
  return calculatePriceIntelligence(observations, { variantId: criteria.variantId ?? "", condition: criteria.condition });
}
