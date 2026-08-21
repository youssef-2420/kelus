import type { ProviderResult, SearchCriteria } from "@/types/kelus";

export interface OfferProvider { id: string; getOffers(criteria: SearchCriteria): Promise<ProviderResult> }
