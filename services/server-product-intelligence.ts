import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";
import type { LiveOfferEnvironment } from "./server-offer-service.ts";
import { readLivePriceObservations } from "./price-observation-store.ts";
import { readProductIntelligenceSnapshot } from "./product-intelligence-snapshot-store.ts";
import { getProductBySlug } from "../lib/demo-data.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export async function resolveInitialProductIntelligence(
  criteria: SearchCriteria,
  environment: LiveOfferEnvironment | undefined,
  databaseTimeoutMs = 450,
): Promise<ProductOfferLoadOutcome> {
  const startedAt = Date.now();
  if (!environment?.DB) return { status: "ERROR", message: "Saved product intelligence is temporarily unavailable." };
  const within = async <T,>(work: Promise<T>, timeoutMs: number, fallback: T) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work.catch(() => fallback),
        new Promise<T>((resolve) => { timeout = setTimeout(() => resolve(fallback), timeoutMs); }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };
  const snapshotStartedAt = Date.now();
  const canonicalProductId = getProductBySlug(criteria.productSlug)?.id;
  const historyStartedAt = Date.now();
  const snapshotPromise = within(readProductIntelligenceSnapshot(environment.DB, criteria), databaseTimeoutMs, null);
  const observationsPromise = canonicalProductId
    ? within(readLivePriceObservations(
      environment.DB,
      canonicalProductId,
      criteria.variantId ?? "",
      criteria.condition,
      500,
      false,
    ), 150, [])
    : Promise.resolve([]);
  const [snapshot, observations] = await Promise.all([snapshotPromise, observationsPromise]);
  const snapshotDurationMs = Date.now() - snapshotStartedAt;
  const historyDurationMs = Date.now() - historyStartedAt;
  if (!snapshot) {
    const outcome = { status: "ERROR", message: "Saved product intelligence is refreshing. Please try again shortly." } as const;
    console.info("[product-intelligence] initial_resolved", {
      source: "persisted_unavailable",
      status: outcome.status,
      durationMs: Date.now() - startedAt,
      snapshotDurationMs,
      offers: 0,
    });
    return outcome;
  }
  const result = { ...snapshot, observations, observationsStored: observations.length > 0 };
  const outcome: ProductOfferLoadOutcome = result.offers.length
    ? { status: "SUCCESS", result }
    : { status: "EMPTY", result };
  console.info("[product-intelligence] initial_resolved", {
    source: "persisted_d1",
    status: outcome.status,
    durationMs: Date.now() - startedAt,
    snapshotDurationMs,
    historyDurationMs,
    offers: outcome.result.offers.length,
  });
  return outcome;
}
