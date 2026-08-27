import type { OfferSearchResult, SearchCriteria } from "@/types/kelus";
import { demoProviders } from "@/services/providers/demo-provider";

export async function getOffersForSearch(criteria: SearchCriteria): Promise<OfferSearchResult> {
  const settled = await Promise.allSettled(demoProviders.map((provider) => provider.getOffers(criteria)));
  const successful = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  return { offers: successful.flatMap((result) => result.offers), observations: successful.flatMap((result) => result.observations), failedProviders: settled.flatMap((result, index) => result.status === "rejected" ? [demoProviders[index].id] : []), isDemo: true };
}
