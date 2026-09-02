import { getProductBySlug, getVariantById } from "../../../lib/demo-data.ts";
import type { ProviderResult, SearchCriteria } from "@/types/kelus";
import type { OfferProvider, ProviderRequestContext } from "@/services/providers/types";
import type { EbayProviderConfig } from "@/services/providers/ebay/config";
import type { EbayItemDetail, EbayItemSummary, EbaySearchResponse } from "@/services/providers/ebay/types";
import { clearEbayTokenCache, getEbayApplicationToken } from "./auth.ts";
import { buildEbayQuery, ebayCategoryId } from "./matching.ts";
import { normalizeEbayItem, observationForEbayOffer } from "./normalize.ts";
import { applyEbayPriceAnomalyDetection, validateEbayCandidate } from "./trust-engine.ts";

type Logger = Pick<Console, "info" | "warn" | "error">;
type CacheEntry = { expiresAt: number; value: ProviderResult };
const maxDetailRequests = 12;

function estimatedKnownTotal(item: EbayItemSummary) {
  const price = Number(item.price?.value);
  const shipping = (item.shippingOptions ?? []).map((option) => Number(option.shippingCost?.value)).filter(Number.isFinite);
  return Number.isFinite(price) && shipping.length ? price + Math.min(...shipping) : Number.POSITIVE_INFINITY;
}

export class EbayProviderError extends Error {
  readonly code: "invalid_search" | "authentication" | "rate_limited" | "timeout" | "network" | "malformed_response" | "provider_error";
  readonly status?: number;
  constructor(message: string, code: EbayProviderError["code"], status?: number) {
    super(message);
    this.name = "EbayProviderError";
    this.code = code;
    this.status = status;
  }
}

export class EbayProvider implements OfferProvider {
  readonly id = "ebay";
  private readonly cache = new Map<string, CacheEntry>();
  private readonly config: EbayProviderConfig;
  private readonly fetcher: typeof fetch;
  private readonly logger: Logger;
  private readonly now: () => number;

  constructor(
    config: EbayProviderConfig,
    fetcher: typeof fetch = fetch,
    logger: Logger = console,
    now: () => number = Date.now,
  ) {
    this.config = config;
    // Cloudflare's native fetch must not be invoked as an object method because
    // that changes its `this` value and triggers an "Illegal invocation" error.
    this.fetcher = (input, init) => fetcher(input, init);
    this.logger = logger;
    this.now = now;
  }

  async getOffers(criteria: SearchCriteria, context?: ProviderRequestContext): Promise<ProviderResult> {
    const product = getProductBySlug(criteria.productSlug);
    const variant = getVariantById(criteria.variantId);
    if (!product || !variant || variant.productId !== product.id || criteria.market !== "us" || !product.searchAttribute.validVariantIds.includes(variant.id)) {
      throw new EbayProviderError("Unsupported or invalid product configuration.", "invalid_search", 400);
    }
    const key = [criteria.productSlug, variant.id, criteria.condition, criteria.market].join(":");
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    this.logger.info("[ebay-provider] request_started", { product: product.slug, variant: variant.id, condition: criteria.condition });
    const fetchedAt = new Date(this.now()).toISOString();
    let token: string;
    try {
      token = await getEbayApplicationToken(this.config, this.fetcher, this.now());
    } catch (error) {
      this.logger.error("[ebay-provider] provider_error", { stage: "authentication", status: error instanceof Error && "status" in error ? error.status : undefined });
      throw new EbayProviderError("We couldn't authenticate with eBay right now.", "authentication");
    }

    let response = await this.search(token, buildEbayQuery(product, variant), ebayCategoryId(product), context?.signal);
    if (response.status === 401) {
      clearEbayTokenCache();
      try {
        token = await getEbayApplicationToken(this.config, this.fetcher, this.now());
      } catch {
        throw new EbayProviderError("We couldn't authenticate with eBay right now.", "authentication", 401);
      }
      response = await this.search(token, buildEbayQuery(product, variant), ebayCategoryId(product), context?.signal);
    }
    if (response.status === 429) {
      this.logger.warn("[ebay-provider] search_failed", { status: response.status, code: "rate_limited" });
      throw new EbayProviderError("eBay is temporarily rate limiting requests.", "rate_limited", 429);
    }
    if (!response.ok) {
      this.logger.warn("[ebay-provider] search_failed", { status: response.status, code: "provider_error" });
      throw new EbayProviderError("eBay offers are temporarily unavailable.", "provider_error", response.status);
    }

    let payload: EbaySearchResponse;
    try {
      payload = await response.json() as EbaySearchResponse;
    } catch {
      throw new EbayProviderError("eBay returned a malformed response.", "malformed_response", response.status);
    }
    if (payload.itemSummaries !== undefined && !Array.isArray(payload.itemSummaries)) {
      throw new EbayProviderError("eBay returned a malformed response.", "malformed_response", response.status);
    }

    const rawItems = payload.itemSummaries ?? [];
    const initiallyValidated = rawItems.flatMap((item) => {
      const validation = validateEbayCandidate(item, product, variant, criteria.condition);
      return validation.accepted ? [{ item, validation }] : [];
    });
    const matchedItems = initiallyValidated.map(({ item }) => item);
    const detailCandidates = [...matchedItems].sort((a, b) => estimatedKnownTotal(a) - estimatedKnownTotal(b)).slice(0, maxDetailRequests);
    const detailResults = await Promise.allSettled(detailCandidates.map((item) => this.getItemDetail(token, item.itemId!, context?.signal)));
    const details = new Map(detailResults.flatMap((result, index) => result.status === "fulfilled" && result.value ? [[detailCandidates[index].itemId, result.value] as const] : []));
    const detailFailures = detailResults.filter((result) => result.status === "rejected").length;
    if (detailFailures) this.logger.warn("[ebay-provider] detail_enrichment_partial", { attempted: detailCandidates.length, failed: detailFailures });
    const normalizedCandidates = matchedItems.flatMap((item) => {
      try {
        const detail = details.get(item.itemId);
        const enriched = detail ? {
          ...item,
          ...detail,
          itemId: item.itemId,
          title: detail.title ?? item.title,
          localizedAspects: detail.localizedAspects ?? item.localizedAspects,
          seller: detail.seller ?? item.seller,
          shippingOptions: detail.shippingOptions ?? item.shippingOptions,
          returnTerms: detail.returnTerms ?? item.returnTerms,
        } : item;
        const validation = validateEbayCandidate(enriched, product, variant, criteria.condition);
        if (!validation.accepted) return [];
        const offer = normalizeEbayItem(enriched, product, variant, fetchedAt);
        return offer ? [{ offer, validation }] : [];
      } catch (error) {
        this.logger.warn("[ebay-provider] normalization_failure", { itemId: item.itemId, message: error instanceof Error ? error.message : "Unknown error" });
        return [];
      }
    });
    const trustedOffers = applyEbayPriceAnomalyDetection(normalizedCandidates);
    const offers = [...new Map(trustedOffers.map((offer) => [offer.id, offer])).values()];
    const observations = offers.filter((offer) => offer.trust?.eligibleForHistory).map(observationForEbayOffer);
    const value: ProviderResult = {
      providerId: this.id,
      offers,
      observations,
      isDemo: false,
      fetchedAt,
    };
    this.cache.set(key, { expiresAt: this.now() + this.config.cacheTtlMs, value });
    this.logger.info("[ebay-provider] request_completed", {
      rawItems: rawItems.length,
      matchedItems: matchedItems.length,
      normalizedOffers: offers.length,
      trustedForRecommendation: offers.filter((offer) => offer.trust?.eligibleForRecommendation).length,
      suspiciousOffers: offers.filter((offer) => offer.trust?.suspiciousPrice).length,
      rejectedItems: rawItems.length - matchedItems.length,
      enrichedItems: details.size,
    });
    return value;
  }

  private async getItemDetail(token: string, itemId: string, externalSignal?: AbortSignal): Promise<EbayItemDetail | null> {
    const url = new URL(this.config.apiBaseUrl + "/buy/browse/v1/item/" + encodeURIComponent(itemId));
    const timeoutSignal = AbortSignal.timeout(this.config.requestTimeoutMs);
    const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
    const response = await this.fetcher(url, {
      headers: {
        Authorization: "Bearer " + token,
        "X-EBAY-C-MARKETPLACE-ID": this.config.marketplaceId,
        "Accept-Language": "en-US",
      },
      signal,
    });
    if (!response.ok) return null;
    try {
      const body = await response.json() as EbayItemDetail;
      return body && typeof body === "object" ? body : null;
    } catch {
      return null;
    }
  }

  private async search(token: string, query: string, categoryId?: string, externalSignal?: AbortSignal) {
    const url = new URL(this.config.apiBaseUrl + "/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", query);
    if (categoryId) url.searchParams.set("category_ids", categoryId);
    url.searchParams.set("limit", "50");
    url.searchParams.set("fieldgroups", "EXTENDED");
    url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE},deliveryCountry:US");
    const timeoutSignal = AbortSignal.timeout(this.config.requestTimeoutMs);
    const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
    try {
      return await this.fetcher(url, {
        headers: {
          Authorization: "Bearer " + token,
          "X-EBAY-C-MARKETPLACE-ID": this.config.marketplaceId,
          "Accept-Language": "en-US",
        },
        signal,
      });
    } catch (error) {
      this.logger.error("[ebay-provider] search_network_error", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined,
      });
      if (error instanceof DOMException && error.name === "TimeoutError") throw new EbayProviderError("The eBay request timed out.", "timeout");
      throw new EbayProviderError("We couldn't reach eBay right now.", "network");
    }
  }
}
