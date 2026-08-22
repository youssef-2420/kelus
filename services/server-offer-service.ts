import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";
import { getProductBySlug } from "@/lib/demo-data";
import type { EbayEnvironment } from "@/services/providers/ebay/config";
import { getEbayProviderConfig } from "@/services/providers/ebay/config";
import { EbayProvider } from "@/services/providers/ebay/provider";
import { readLivePriceObservations, storeLivePriceObservations, type ObservationDatabase } from "@/services/price-observation-store";

type LiveOfferEnvironment = EbayEnvironment & { DB?: ObservationDatabase };

let providerState: { key: string; provider: EbayProvider } | null = null;

function providerFor(env: EbayEnvironment, fetcher: typeof fetch) {
  const config = getEbayProviderConfig(env);
  const key = [config.clientId, config.marketplaceId, config.cacheTtlMs, config.requestTimeoutMs].join(":");
  if (!providerState || providerState.key !== key) providerState = { key, provider: new EbayProvider(config, fetcher) };
  return providerState.provider;
}

export async function getLiveOffersForSearch(criteria: SearchCriteria, env: LiveOfferEnvironment, fetcher: typeof fetch = fetch): Promise<OfferSearchResult> {
  const provider = providerFor(env, fetcher);
  const providers = [provider];
  const settled = await Promise.allSettled(providers.map((current) => current.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failedProviders = settled.flatMap((result, index) => result.status === "rejected" ? [providers[index].id] : []);
  if (!successful.length && failedProviders.length) throw settled[0].status === "rejected" ? settled[0].reason : new Error("eBay offers are unavailable.");
  const currentObservations = successful.flatMap((result) => result.observations);
  let observations = currentObservations;
  if (env.DB) {
    try {
      const canonicalProductId = getProductBySlug(criteria.productSlug)?.id;
      if (!canonicalProductId) throw new Error("Canonical product is unavailable.");
      const stored = await storeLivePriceObservations(env.DB, canonicalProductId, currentObservations);
      observations = await readLivePriceObservations(env.DB, criteria.variantId ?? "");
      console.info("[price-observations] stored", { provider: "ebay", inserted: stored, available: observations.length });
    } catch (error) {
      console.warn("[price-observations] storage_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return {
    offers: successful.flatMap((result) => result.offers),
    observations,
    failedProviders,
    connectedProviders: ["ebay"],
    isDemo: false,
    lastUpdated: successful.map((result) => result.fetchedAt).filter((value): value is string => Boolean(value)).sort().at(-1),
  };
}
