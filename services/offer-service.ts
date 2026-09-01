"use client";

import { searchCriteriaToQuery } from "@/lib/search-state";
import { trackEvent } from "@/services/analytics";
import { userFacingOfferError } from "@/services/user-facing-errors";
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

const initialRequestTimeoutMs = 12_000;
const retryRequestTimeoutMs = 6_000;

async function fetchOffers(criteria: SearchCriteria, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl(criteria), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json() as OfferSearchResult | ApiErrorBody;
    return { response, body };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getOffersForSearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void): Promise<OfferSearchResult> {
  onStatus?.("resolving_product");
  onStatus?.("fetching_offers");
  trackEvent({ name: "search_started", productSlug: criteria.productSlug });
  trackEvent({ name: "provider_search_started", provider: "ebay", productSlug: criteria.productSlug });
  trackEvent({ name: "live_provider_search_started", provider: "ebay", productSlug: criteria.productSlug });
  let response: Response;
  let body: OfferSearchResult | ApiErrorBody;
  try {
    ({ response, body } = await fetchOffers(criteria, initialRequestTimeoutMs));
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      ({ response, body } = await fetchOffers(criteria, retryRequestTimeoutMs));
    }
  } catch (error) {
    trackEvent({ name: "live_provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    trackEvent({ name: "provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    const malformed = error instanceof SyntaxError;
    throw new OfferSearchError(
      userFacingOfferError(timedOut ? "timeout" : malformed ? "malformed_response" : "network", undefined, timedOut ? "The live search took too long. Please try again." : malformed ? "The eBay offer service returned an invalid response." : "We couldn't reach the eBay offer service."),
      timedOut ? "timeout" : malformed ? "malformed_response" : "network",
    );
  }
  const isResult = "offers" in body && Array.isArray(body.offers) && "failedProviders" in body && Array.isArray(body.failedProviders);
  if (!response.ok || !isResult) {
    const error = "error" in body ? body.error : undefined;
    trackEvent({ name: "live_provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    trackEvent({ name: "provider_search_failed", provider: "ebay", productSlug: criteria.productSlug });
    throw new OfferSearchError(userFacingOfferError(error?.code, response.status, error?.message), error?.code, response.status);
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
