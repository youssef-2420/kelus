import { getProductBySlug, getVariantById } from "../../../lib/demo-data.ts";
import type { ProviderResult, SearchCriteria } from "@/types/kelus";
import type { OfferProvider, ProviderRequestContext } from "@/services/providers/types";
import type { EbayProviderConfig } from "@/services/providers/ebay/config";
import type { EbaySearchResponse } from "@/services/providers/ebay/types";
import { clearEbayTokenCache, getEbayApplicationToken } from "./auth.ts";
import { buildEbayQuery, matchesCanonicalEbayItem } from "./matching.ts";
import { normalizeEbayItem, observationForEbayOffer } from "./normalize.ts";

type Logger = Pick<Console, "info" | "warn" | "error">;
type CacheEntry = { expiresAt: number; value: ProviderResult };

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
    this.fetcher = fetcher;
    this.logger = logger;
    this.now = now;
  }

  async getOffers(criteria: SearchCriteria, context?: ProviderRequestContext): Promise<ProviderResult> {
    const product = getProductBySlug(criteria.productSlug);
    const variant = getVariantById(criteria.variantId);
    if (!product || !variant || variant.productId !== product.id || criteria.market !== "us" || !product.slug.startsWith("iphone-17")) {
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

    let response = await this.search(token, buildEbayQuery(product, variant), context?.signal);
    if (response.status === 401) {
      clearEbayTokenCache();
      try {
        token = await getEbayApplicationToken(this.config, this.fetcher, this.now());
      } catch {
        throw new EbayProviderError("We couldn't authenticate with eBay right now.", "authentication", 401);
      }
      response = await this.search(token, buildEbayQuery(product, variant), context?.signal);
    }
    if (response.status === 429) throw new EbayProviderError("eBay is temporarily rate limiting requests.", "rate_limited", 429);
    if (!response.ok) throw new EbayProviderError("eBay offers are temporarily unavailable.", "provider_error", response.status);

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
    const matchedItems = rawItems.filter((item) => matchesCanonicalEbayItem(item, product, variant, criteria.condition));
    const offers = matchedItems.flatMap((item) => {
      try {
        const offer = normalizeEbayItem(item, product, variant, fetchedAt);
        return offer ? [offer] : [];
      } catch (error) {
        this.logger.warn("[ebay-provider] normalization_failure", { itemId: item.itemId, message: error instanceof Error ? error.message : "Unknown error" });
        return [];
      }
    });
    const value: ProviderResult = {
      providerId: this.id,
      offers,
      observations: offers.map(observationForEbayOffer),
      isDemo: false,
      fetchedAt,
    };
    this.cache.set(key, { expiresAt: this.now() + this.config.cacheTtlMs, value });
    this.logger.info("[ebay-provider] request_completed", { rawItems: rawItems.length, matchedItems: matchedItems.length, normalizedOffers: offers.length });
    return value;
  }

  private async search(token: string, query: string, externalSignal?: AbortSignal) {
    const url = new URL(this.config.apiBaseUrl + "/buy/browse/v1/item_summary/search");
    url.searchParams.set("q", query);
    url.searchParams.set("category_ids", "9355");
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
      if (error instanceof DOMException && error.name === "TimeoutError") throw new EbayProviderError("The eBay request timed out.", "timeout");
      throw new EbayProviderError("We couldn't reach eBay right now.", "network");
    }
  }
}
