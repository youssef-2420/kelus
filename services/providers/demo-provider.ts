import type { Offer, PriceObservation, ProductVariant, ProviderResult, Retailer, Seller } from "@/types/kelus";
import type { OfferProvider } from "@/services/providers/types";

const retailers: Record<string, Retailer> = {
  amazon: { id: "amazon", name: "Amazon", logo: "A", website: "https://www.amazon.com" },
  bestBuy: { id: "best-buy", name: "Best Buy", logo: "B", website: "https://www.bestbuy.com" },
  ebay: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" },
};
const sellers: Record<string, Seller> = {
  amazon: { id: "amazon-retail", retailerId: "amazon", name: "Amazon", sellerType: "retailer" },
  bestBuy: { id: "best-buy-retail", retailerId: "best-buy", name: "Best Buy", sellerType: "retailer" },
  ebay: { id: "ebay-demo-seller", retailerId: "ebay", name: "Top Rated seller", sellerType: "marketplace_seller" },
};

export class DemoOfferProvider implements OfferProvider {
  id = "demo";
  async getOffers(variant: ProductVariant): Promise<ProviderResult> {
    const offers: Offer[] = [
      { id: "amazon-iphone-17-256", variantId: variant.id, retailer: retailers.amazon, seller: sellers.amazon, price: 799, currency: "USD", condition: "New", shippingCost: 0, delivery: "Free delivery tomorrow", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "30-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
      { id: "best-buy-iphone-17-256", variantId: variant.id, retailer: retailers.bestBuy, seller: sellers.bestBuy, price: 799, currency: "USD", condition: "New", shippingCost: 0, delivery: "Free pickup today", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "15-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
      { id: "ebay-iphone-17-256", variantId: variant.id, retailer: retailers.ebay, seller: sellers.ebay, price: 749, currency: "USD", condition: "Used - like new", shippingCost: 0, delivery: "Free delivery in 2 days", availability: "Limited stock", warranty: "1-year marketplace warranty", returnPolicy: "30-day seller return terms", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
    ];
    const observations: PriceObservation[] = [899, 879, 849, 829, 799, 799].map((price, index) => ({ id: `demo-price-${index}`, offerId: offers[0].id, price, timestamp: `2026-0${4 + index}-01T12:00:00Z`, isDemo: true }));
    return { offers, observations, isDemo: true };
  }
}
