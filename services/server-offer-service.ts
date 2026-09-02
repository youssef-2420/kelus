import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";
import { getProductBySlug } from "@/lib/demo-data";
import type { EbayEnvironment } from "@/services/providers/ebay/config";
import { getEbayProviderConfig } from "@/services/providers/ebay/config";
import { EbayProvider } from "@/services/providers/ebay/provider";
import { readLivePriceObservations, storeLivePriceObservations, type ObservationDatabase } from "@/services/price-observation-store";
import { readSupabasePriceObservations, storeSupabasePriceObservations, type SupabaseObservationEnvironment } from "@/services/supabase-price-observation-store";
import {
  markProductIntelligenceRefreshEmpty,
  markProductIntelligenceRefreshFailure,
  readProductIntelligenceSnapshot,
  staleSnapshotAfterRefresh,
  storeProductIntelligenceSnapshot,
  type ProductIntelligenceSnapshotDatabase,
} from "@/services/product-intelligence-snapshot-store";

export type LiveOfferEnvironment = EbayEnvironment & SupabaseObservationEnvironment & { DB?: ObservationDatabase & ProductIntelligenceSnapshotDatabase };

let providerState: { key: string; provider: EbayProvider } | null = null;

type LiveOfferOptions = { allowStaleFallback?: boolean; snapshotReadTimeoutMs?: number };

async function within<T>(work: Promise<T>, timeoutMs: number, fallback: T) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.catch(() => fallback),
      new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function providerFor(env: EbayEnvironment, fetcher: typeof fetch) {
  const config = getEbayProviderConfig(env);
  const key = [config.clientId, config.marketplaceId, config.cacheTtlMs, config.requestTimeoutMs].join(":");
  if (!providerState || providerState.key !== key) providerState = { key, provider: new EbayProvider(config, fetcher) };
  return providerState.provider;
}

export async function getLiveOffersForSearch(
  criteria: SearchCriteria,
  env: LiveOfferEnvironment,
  fetcher: typeof fetch = fetch,
  options: LiveOfferOptions = {},
): Promise<OfferSearchResult> {
  const requestStartedAt = Date.now();
  const refreshAttemptedAt = new Date(requestStartedAt).toISOString();
  const snapshotPromise = options.allowStaleFallback && env.DB
    ? within(readProductIntelligenceSnapshot(env.DB, criteria), options.snapshotReadTimeoutMs ?? 500, null)
    : Promise.resolve(null);
  let provider: EbayProvider;
  try {
    provider = providerFor(env, fetcher);
  } catch (error) {
    const snapshot = await snapshotPromise;
    if (env.DB) await markProductIntelligenceRefreshFailure(env.DB, criteria, refreshAttemptedAt).catch(() => false);
    const stale = options.allowStaleFallback ? staleSnapshotAfterRefresh(snapshot, "failed", refreshAttemptedAt) : null;
    if (stale) return stale;
    throw error;
  }
  const providers = [provider];
  const settled = await Promise.allSettled(providers.map((current) => current.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const providerDurationMs = Date.now() - requestStartedAt;
  const failedProviders = settled.flatMap((result, index) => result.status === "rejected" ? [providers[index].id] : []);
  for (const [index, outcome] of settled.entries()) {
    if (outcome.status !== "rejected") continue;
    const reason = outcome.reason;
    console.warn("[product-intelligence] provider_refresh_failed", {
      provider: providers[index].id,
      productSlug: criteria.productSlug,
      variantId: criteria.variantId,
      condition: criteria.condition,
      code: typeof reason === "object" && reason !== null && "code" in reason ? reason.code : "provider_error",
      status: typeof reason === "object" && reason !== null && "status" in reason ? reason.status : undefined,
      message: reason instanceof Error ? reason.message : "Unknown provider failure",
      durationMs: providerDurationMs,
    });
  }
  const persistedSnapshot = await snapshotPromise;
  if (!successful.length && failedProviders.length) {
    if (env.DB) await markProductIntelligenceRefreshFailure(env.DB, criteria, refreshAttemptedAt).catch(() => false);
    const stale = options.allowStaleFallback ? staleSnapshotAfterRefresh(persistedSnapshot, "failed", refreshAttemptedAt) : null;
    if (stale) return stale;
    throw settled[0].status === "rejected" ? settled[0].reason : new Error("eBay offers are unavailable.");
  }
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
  if (!baseResult.offers.length && persistedSnapshot?.offers.length) {
    if (env.DB) await markProductIntelligenceRefreshEmpty(env.DB, criteria, refreshAttemptedAt).catch(() => false);
    return staleSnapshotAfterRefresh(persistedSnapshot, "empty", refreshAttemptedAt)!;
  }
  const snapshotTask = env.DB && canonicalProductId ? (async () => {
    const snapshotStartedAt = Date.now();
    try {
      await storeProductIntelligenceSnapshot(env.DB!, canonicalProductId, criteria, baseResult);
    } catch (error) {
      console.warn("[product-intelligence] snapshot_store_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    }
    console.info("[product-intelligence] snapshot_store_complete", { durationMs: Date.now() - snapshotStartedAt });
  })() : Promise.resolve();
  const supabaseTask = canonicalProductId ? (async () => {
    const supabaseStartedAt = Date.now();
    try {
      const stored = await storeSupabasePriceObservations(env, canonicalProductId, currentObservations);
      const history = await readSupabasePriceObservations(env, canonicalProductId, criteria.variantId ?? "", criteria.condition);
      if (history) console.info("[price-observations] supabase_stored", { provider: "ebay", inserted: stored, available: history.length });
      return history;
    } catch (error) {
      console.warn("[price-observations] supabase_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
      return null;
    } finally {
      console.info("[price-observations] supabase_complete", { durationMs: Date.now() - supabaseStartedAt });
    }
  })() : Promise.resolve(null);
  const d1Task = env.DB && canonicalProductId ? (async () => {
    const d1StartedAt = Date.now();
    try {
      const stored = await storeLivePriceObservations(env.DB!, canonicalProductId, currentObservations);
      const history = await readLivePriceObservations(env.DB!, canonicalProductId, criteria.variantId ?? "", criteria.condition);
      console.info("[price-observations] d1_stored", { provider: "ebay", inserted: stored, available: history.length });
      return history;
    } catch (error) {
      console.warn("[price-observations] d1_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
      return null;
    } finally {
      console.info("[price-observations] d1_complete", { durationMs: Date.now() - d1StartedAt });
    }
  })() : Promise.resolve(null);
  const [, supabaseHistory, d1History] = await Promise.all([snapshotTask, supabaseTask, d1Task]);
  const histories = [supabaseHistory, d1History].filter((history): history is typeof currentObservations => history !== null);
  observationsStored = histories.length > 0;
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
