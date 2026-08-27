export const CONDITIONS = ["any", "new", "used", "refurbished"] as const;
export type ConditionFilter = (typeof CONDITIONS)[number];
export type OfferCondition = Exclude<ConditionFilter, "any">;
export type Market = "us";

export type ProductSearchAttributeType = "storage" | "size" | "edition" | "configuration" | "none";
export type ProductSearchAttribute = { type: ProductSearchAttributeType; validVariantIds: string[] };
export type Product = { id: string; brand: string; name: string; category: string; slug: string; image: string; identifiers: Record<string, string>; searchAttribute: ProductSearchAttribute; searchPreview?: { fromPrice: number; offerCount: number; isDemo: boolean } };
export type ProductVariant = { id: string; productId: string; label: string; storage?: string; color?: string; specifications: Record<string, string>; identifiers: Record<string, string> };
export type Retailer = { id: string; name: string; logo: string; website: string };
export type Seller = {
  id: string;
  retailerId: string;
  name: string | null;
  sellerType: "retailer" | "marketplace_seller";
  feedbackPercentage?: number;
  feedbackScore?: number;
  topRated?: boolean;
};
export type SearchCriteria = { productSlug: string; variantId?: string; condition: ConditionFilter; market: Market };

export type Offer = {
  id: string; productId: string; variantId: string; retailer: Retailer; seller: Seller; price: number; currency: "USD"; condition: OfferCondition;
  shippingCost: number; shippingCostKnown?: boolean; delivery: string; availability: "In stock" | "Limited stock" | "Unknown"; warranty: string;
  returnPolicy: string; affiliateUrl: string | null; lastUpdated: string; dataSource: "demo" | "live";
  sourceProvider?: "ebay" | string;
  sourceCondition?: string;
  sourceTitle?: string;
  imageUrl?: string;
  itemLocation?: string;
};

export type PriceObservation = {
  id: string;
  offerId: string;
  price: number;
  timestamp: string;
  isDemo: boolean;
  variantId?: string;
  providerId?: string;
  retailerId?: string;
  shippingCost?: number | null;
  condition?: OfferCondition;
  availability?: Offer["availability"];
};
export type PricePoint = { label: string; price: number };
export type PriceVerdict = "Great price" | "Good price" | "Typical" | "Expensive" | "Price history is building";
export type PriceContext = { currentTrustedPrice: number | null; average30Day: number | null; average90Day: number | null; recentLow: number | null; recentHigh: number | null; trend: "rising" | "falling" | "stable"; verdict: PriceVerdict; isDemo: false; historyStatus: "building" | "ready"; observationCount: number };
export type RecommendationKind = "kelus_pick" | "cheapest" | "safest_option";
export type Recommendation = { offerId: string; kind: RecommendationKind; reasons: string[]; tradeoffs: string[] };
export type ProviderResult = { providerId: string; offers: Offer[]; observations: PriceObservation[]; isDemo: boolean; fetchedAt?: string };
export type OfferSearchResult = {
  offers: Offer[];
  observations: PriceObservation[];
  observationsStored?: boolean;
  servedFromCache?: boolean;
  refreshRecommended?: boolean;
  failedProviders: string[];
  isDemo: boolean;
  connectedProviders?: string[];
  lastUpdated?: string;
};
export type SearchStatus = "idle" | "resolving_product" | "fetching_offers" | "normalizing_offers" | "ranking" | "complete" | "partial" | "error";
