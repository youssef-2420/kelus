import type { ProductOfferLoadOutcome } from "./product-offer-load.ts";

export type ClientOfferRefreshMode = "none" | "idle" | "immediate";

export function clientOfferRefreshMode(initialOutcome: ProductOfferLoadOutcome | undefined, attempt: number): ClientOfferRefreshMode {
  if (attempt > 0 || !initialOutcome || initialOutcome.status === "ERROR") return "immediate";
  if (!initialOutcome.result.offers.length) return "immediate";
  return initialOutcome.result.refreshRecommended ? "idle" : "none";
}
