export const CONDITIONS = ["any", "new", "used", "refurbished"] as const;
export type ConditionFilter = (typeof CONDITIONS)[number];
export type OfferCondition = Exclude<ConditionFilter, "any">;
export type Market = "us";

export type Product = { id: string; brand: string; name: string; category: string; slug: string; image: string; identifiers: Record<string, string> };
export type ProductVariant = { id: string; productId: string; label: string; storage?: string; color?: string; specifications: Record<string, string>; identifiers: Record<string, string> };
export type Retailer = { id: string; name: string; logo: string; website: string };
export type Seller = { id: string; retailerId: string; name: string; sellerType: "retailer" | "marketplace_seller" };
export type SearchCriteria = { productSlug: string; variantId?: string; condition: ConditionFilter; market: Market };

export type Offer = {
  id: string; productId: string; variantId: string; retailer: Retailer; seller: Seller; price: number; currency: "USD"; condition: OfferCondition;
  shippingCost: number; delivery: string; availability: "In stock" | "Limited stock" | "Unknown"; warranty: string;
  returnPolicy: string; affiliateUrl: string | null; lastUpdated: string; dataSource: "demo" | "live";
};

export type PriceObservation = { id: string; offerId: string; price: number; timestamp: string; isDemo: boolean };
export type PricePoint = { label: string; price: number };
export type PriceContext = { currentTrustedPrice: number | null; average30Day: number | null; average90Day: number | null; recentLow: number | null; recentHigh: number | null; trend: "rising" | "falling" | "stable"; verdict: string; isDemo: boolean };
export type RecommendationKind = "kelus_pick" | "cheapest" | "safest_option";
export type Recommendation = { offerId: string; kind: RecommendationKind; reasons: string[]; tradeoffs: string[] };
export type ProviderResult = { providerId: string; offers: Offer[]; observations: PriceObservation[]; isDemo: boolean };
export type OfferSearchResult = { offers: Offer[]; observations: PriceObservation[]; failedProviders: string[]; isDemo: boolean };
