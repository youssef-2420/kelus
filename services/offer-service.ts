import type { OfferSearchResult, SearchCriteria, SearchStatus } from "@/types/kelus";
import { demoProviders } from "./providers/demo-provider.ts";
import type { OfferProvider } from "@/services/providers/types";

export async function getOffersForSearch(
  criteria: SearchCriteria,
  onStatus?: (status: SearchStatus) => void,
  providers: OfferProvider[] = demoProviders,
): Promise<OfferSearchResult> {
  onStatus?.("resolving_product");
  onStatus?.("fetching_offers");
  const settled = await Promise.allSettled(providers.map((provider) => provider.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!successful.length) {
    onStatus?.("error");
    throw new Error("All offer providers failed.");
  }
  onStatus?.("normalizing_offers");
  const response = { offers: successful.flatMap((result) => result.offers), observations: successful.flatMap((result) => result.observations), failedProviders: settled.flatMap((result, index) => result.status === "rejected" ? [providers[index].id] : []), isDemo: true };
  onStatus?.("ranking");
  onStatus?.(response.failedProviders.length ? "partial" : "complete");
  return response;
}
