import type { OfferSearchResult, SearchCriteria, SearchStatus } from "@/types/kelus";
import { demoProviders } from "@/services/providers/demo-provider";

export async function getOffersForSearch(criteria: SearchCriteria, onStatus?: (status: SearchStatus) => void): Promise<OfferSearchResult> {
  onStatus?.("resolving_product");
  onStatus?.("fetching_offers");
  const settled = await Promise.allSettled(demoProviders.map((provider) => provider.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  onStatus?.("normalizing_offers");
  const response = { offers: successful.flatMap((result) => result.offers), observations: successful.flatMap((result) => result.observations), failedProviders: settled.flatMap((result, index) => result.status === "rejected" ? [demoProviders[index].id] : []), isDemo: true };
  onStatus?.("ranking");
  onStatus?.(response.failedProviders.length ? "partial" : "complete");
  return response;
}
