export type Condition = "New" | "Used - like new" | "Used - very good" | "Used - good" | "Refurbished";

export type Product = { id: string; brand: string; name: string; category: string; slug: string; image: string; identifiers: Record<string, string> };
export type ProductVariant = { id: string; productId: string; label: string; storage?: string; color?: string; specifications: Record<string, string>; identifiers: Record<string, string> };
export type Retailer = { id: string; name: string; logo: string; website: string };
export type Seller = { id: string; retailerId: string; name: string; sellerType: "retailer" | "marketplace_seller" };

export type Offer = {
  id: string; variantId: string; retailer: Retailer; seller: Seller; price: number; currency: "USD"; condition: Condition;
  shippingCost: number; delivery: string; availability: "In stock" | "Limited stock" | "Unknown"; warranty: string;
  returnPolicy: string; affiliateUrl: string | null; lastUpdated: string; isDemo: boolean;
};

export type PriceObservation = { id: string; offerId: string; price: number; timestamp: string; isDemo: boolean };
export type PricePoint = { label: string; price: number };
export type RecommendationKind = "kelus_pick" | "cheapest" | "safest_option";
export type Recommendation = { offerId: string; kind: RecommendationKind; reasons: string[]; tradeoffs: string[] };
export type ProviderResult = { offers: Offer[]; observations: PriceObservation[]; isDemo: boolean };
