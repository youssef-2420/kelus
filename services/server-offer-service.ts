import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";
import { getProductBySlug } from "@/lib/demo-data";
import type { EbayEnvironment } from "@/services/providers/ebay/config";
import { getEbayProviderConfig } from "@/services/providers/ebay/config";
import { EbayProvider } from "@/services/providers/ebay/provider";
import { readLivePriceObservations, storeLivePriceObservations, type ObservationDatabase } from "@/services/price-observation-store";
import { readSupabasePriceObservations, storeSupabasePriceObservations, type SupabaseObservationEnvironment } from "@/services/supabase-price-observation-store";
import { storeProductIntelligenceSnapshot, type ProductIntelligenceSnapshotDatabase } from "@/services/product-intelligence-snapshot-store";

export type LiveOfferEnvironment = EbayEnvironment & SupabaseObservationEnvironment & { DB?: ObservationDatabase & ProductIntelligenceSnapshotDatabase };

let providerState: { key: string; provider: EbayProvider } | null = null;

function providerFor(env: EbayEnvironment, fetcher: typeof fetch) {
  const config = getEbayProviderConfig(env);
  const key = [config.clientId, config.marketplaceId, config.cacheTtlMs, config.requestTimeoutMs].join(":");
  if (!providerState || providerState.key !== key) providerState = { key, provider: new EbayProvider(config, fetcher) };
  return providerState.provider;
}

export async function getLiveOffersForSearch(criteria: SearchCriteria, env: LiveOfferEnvironment, fetcher: typeof fetch = fetch): Promise<OfferSearchResult> {
  const requestStartedAt = Date.now();
  const provider = providerFor(env, fetcher);
  const providers = [provider];
  const settled = await Promise.allSettled(providers.map((current) => current.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const providerDurationMs = Date.now() - requestStartedAt;
  const failedProviders = settled.flatMap((result, index) => result.status === "rejected" ? [providers[index].id] : []);
  if (!successful.length && failedProviders.length) throw settled[0].status === "rejected" ? settled[0].reason : new Error("eBay offers are unavailable.");
  const currentObservations = successful.flatMap((result) => result.observations);
  const baseResult: OfferSearchResult = {
    offers: successful.flatMap((result) => result.offers),
    observations: [],
    observationsStored: false,
    failedProviders,
    connectedProviders: ["ebay"],
    isDemo: false,
    lastUpdated: successful.map((result) => result.fetchedAt).filter((value): value is string => Boolean(value)).sort().at(-1),
  };
  let observations = currentObservations;
  let observationsStored = false;
  const canonicalProductId = getProductBySlug(criteria.productSlug)?.id;
  if (env.DB && canonicalProductId) {
    const snapshotStartedAt = Date.now();
    try {
      await storeProductIntelligenceSnapshot(env.DB, canonicalProductId, criteria, baseResult);
    } catch (error) {
      console.warn("[product-intelligence] snapshot_store_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    console.info("[product-intelligence] snapshot_store_complete", { durationMs: Date.now() - snapshotStartedAt });
  }
  const histories: typeof currentObservations[] = [];
  if (canonicalProductId) {
    const supabaseStartedAt = Date.now();
    try {
      const stored = await storeSupabasePriceObservations(env, canonicalProductId, currentObservations);
      const history = await readSupabasePriceObservations(env, canonicalProductId, criteria.variantId ?? "", criteria.condition);
      if (history) {
        histories.push(history);
        observationsStored = true;
        console.info("[price-observations] supabase_stored", { provider: "ebay", inserted: stored, available: history.length });
      }
    } catch (error) {
      console.warn("[price-observations] supabase_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    console.info("[price-observations] supabase_complete", { durationMs: Date.now() - supabaseStartedAt });
  }
  if (env.DB && canonicalProductId) {
    const d1StartedAt = Date.now();
    try {
      const stored = await storeLivePriceObservations(env.DB, canonicalProductId, currentObservations);
      const history = await readLivePriceObservations(env.DB, canonicalProductId, criteria.variantId ?? "", criteria.condition);
      histories.push(history);
      observationsStored = true;
      console.info("[price-observations] d1_stored", { provider: "ebay", inserted: stored, available: history.length });
    } catch (error) {
      console.warn("[price-observations] d1_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    console.info("[price-observations] d1_complete", { durationMs: Date.now() - d1StartedAt });
  }
  if (histories.length) {
    observations = [...new Map(histories.flat().map((observation) => [
      [observation.providerId, observation.offerId, observation.timestamp].join("|"),
      observation,
    ])).values()];
  }
  const result = {
    ...baseResult,
    observations,
    observationsStored,
  };
  console.info("[product-intelligence] live_pipeline_complete", {
    providerDurationMs,
    totalDurationMs: Date.now() - requestStartedAt,
    offers: result.offers.length,
  });
  return result;
}
