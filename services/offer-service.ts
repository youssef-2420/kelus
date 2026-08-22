"use client";

import { searchCriteriaToQuery } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import type { OfferSearchResult, SearchCriteria, SearchStatus } from "@/types/kelus";

type ApiErrorBody = { error?: { code?: string; message?: string } };

export class OfferSearchError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(message: string, code = "provider_error", status?: number) {
    super(message);
    this.name = "OfferSearchError";
    this.code = code;
    this.status = status;
  }
}

function apiUrl(criteria: SearchCriteria) {
  return "/api/offers?" + searchCriteriaToQuery(criteria);
}

export async function getOffersForSearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void): Promise<OfferSearchResult> {
  onStatus?.("resolving_product");
  onStatus?.("fetching_offers");
  trackEvent({ name: "search_started", productSlug: criteria.productSlug });
  trackEvent({ name: "provider_search_started", provider: "ebay", productSlug: criteria.productSlug });
  trackEvent({ name: "live_provider_search_started", provider: "ebay", productSlug: criteria.productSlug });
  let response: Response;
  try {
    response = await fetch(apiUrl(criteria), { headers: { Accept: "application/json" } });
  } catch {
    trackEvent({ name: "live_provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    trackEvent({ name: "provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    throw new OfferSearchError("We couldn't reach the eBay offer service.", "network");
  }
  let body: OfferSearchResult | ApiErrorBody;
  try {
    body = await response.json() as OfferSearchResult | ApiErrorBody;
  } catch {
    trackEvent({ name: "live_provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    trackEvent({ name: "provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    throw new OfferSearchError("The eBay offer service returned an invalid response.", "malformed_response", response.status);
  }
  const isResult = "offers" in body && Array.isArray(body.offers) && "failedProviders" in body && Array.isArray(body.failedProviders);
  if (!response.ok || !isResult) {
    const error = "error" in body ? body.error : undefined;
    trackEvent({ name: "live_provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    trackEvent({ name: "provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    throw new OfferSearchError(error?.message ?? "We couldn't load eBay offers right now.", error?.code, response.status);
  }
  onStatus?.("normalizing_offers");
  onStatus?.("ranking");
  const result = body as OfferSearchResult;
  onStatus?.(result.failedProviders.length ? "partial" : "complete");
  trackEvent({ name: "live_provider_search_completed", provider: "ebay", productSlug: criteria.productSlug, offerCount: result.offers.length });
  trackEvent({ name: "provider_search_completed", provider: "ebay", productSlug: criteria.productSlug, offerCount: result.offers.length });
  trackEvent({ name: "search_completed", productSlug: criteria.productSlug });
  return result;
}
