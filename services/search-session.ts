"use client";

import { searchCriteriaToQuery } from "@/lib/search-state";
import { getOffersForSearch } from "@/services/offer-service";
import type { OfferSearchResult, SearchCriteria, SearchStatus } from "@/types/kelus";

type SearchEntry = { promise: Promise<OfferSearchResult>; expiresAt: number };
type StoredSearch = { cachedAt: number; result: OfferSearchResult };

const searches = new Map<string, SearchEntry>();
const keyFor = (criteria: SearchCriteria) => searchCriteriaToQuery(criteria);
const memoryTtlMs = 60_000;
const storageTtlMs = 10 * 60_000;
const storageKey = (criteria: SearchCriteria) => `kelus:offers:${keyFor(criteria)}`;

export function readCachedSearch(criteria: SearchCriteria): StoredSearch | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey(criteria)) ?? "null") as StoredSearch | null;
    if (!value || !value.result || Date.now() - value.cachedAt > storageTtlMs) return null;
    return value;
  } catch {
    return null;
  }
}

function storeSearch(criteria: SearchCriteria, result: OfferSearchResult) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(criteria), JSON.stringify({ cachedAt: Date.now(), result } satisfies StoredSearch));
  } catch {
    // Storage can be unavailable in strict privacy modes; live search still works.
  }
}

export function startSearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void) {
  const key = keyFor(criteria);
  const current = searches.get(key);
  if (current && current.expiresAt > Date.now()) return current.promise;
  const request = getOffersForSearch(criteria, onStatus)
    .then((result) => { storeSearch(criteria, result); return result; })
    .catch((error) => { searches.delete(key); throw error; });
  searches.set(key, { promise: request, expiresAt: Date.now() + memoryTtlMs });
  return request;
}

export function retrySearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void) {
  searches.delete(keyFor(criteria));
  return startSearch(criteria, onStatus);
}
