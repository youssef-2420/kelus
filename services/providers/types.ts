import type { ProviderResult, SearchCriteria } from "@/types/kelus";

export type ProviderRequestContext = { signal?: AbortSignal };
export interface OfferProvider { id: string; getOffers(criteria: SearchCriteria, context?: ProviderRequestContext): Promise<ProviderResult> }
