import { getCriteriaListingPreview, rankAlternativeCriteria } from "./catalog-availability.ts";
import { canonicalProductPath, getAlternativeProductCriteria } from "./search-state.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export function findBestValidatedAlternative(criteria: SearchCriteria, limit = 12) {
  const alternatives = rankAlternativeCriteria(criteria, getAlternativeProductCriteria(criteria, limit));
  return alternatives.find((alternative) => getCriteriaListingPreview(alternative).live) ?? null;
}

export function shouldRedirectToValidatedAlternative(criteria: SearchCriteria, hasLiveOffers: boolean) {
  if (hasLiveOffers) return null;
  const alternative = findBestValidatedAlternative(criteria);
  if (!alternative) return null;
  try {
    return canonicalProductPath(alternative) !== canonicalProductPath(criteria) ? alternative : null;
  } catch {
    return null;
  }
}
