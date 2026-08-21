"use client";

import { searchCriteriaToQuery } from "@/lib/search-state";
import { getOffersForSearch } from "@/services/offer-service";
import type { OfferSearchResult, SearchCriteria, SearchStatus } from "@/types/kelus";

const searches = new Map<string, Promise<OfferSearchResult>>();
const keyFor = (criteria: SearchCriteria) => searchCriteriaToQuery(criteria);

export function startSearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void) {
  const key = keyFor(criteria);
  const current = searches.get(key);
  if (current) return current;
  const request = getOffersForSearch(criteria, onStatus).catch((error) => { searches.delete(key); throw error; });
  searches.set(key, request);
  return request;
}

export function retrySearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void) {
  searches.delete(keyFor(criteria));
  return startSearch(criteria, onStatus);
}
