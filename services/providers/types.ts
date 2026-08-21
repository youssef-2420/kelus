import type { ProductVariant, ProviderResult } from "@/types/kelus";

export interface OfferProvider { id: string; getOffers(variant: ProductVariant): Promise<ProviderResult> }
