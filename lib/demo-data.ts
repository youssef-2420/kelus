import type { Condition, Offer, PricePoint, Product, ProductVariant, Recommendation } from "@/types/kelus";

export const featuredProduct: Product = { id: "apple-iphone-17", slug: "iphone-17", name: "iPhone 17", category: "Smartphone", brand: "Apple", image: "IPH", identifiers: { brand: "Apple", family: "iPhone" } };
export const products: Product[] = [
  featuredProduct,
  { id: "apple-iphone-17-pro", slug: "iphone-17-pro", name: "iPhone 17 Pro", category: "Smartphone", brand: "Apple", image: "17P", identifiers: { brand: "Apple", family: "iPhone" } },
  { id: "apple-macbook-air-m4", slug: "macbook-air-m4", name: "MacBook Air M4", category: "Laptop", brand: "Apple", image: "MBA", identifiers: { brand: "Apple", family: "MacBook" } },
  { id: "apple-airpods-pro-2", slug: "airpods-pro-2", name: "AirPods Pro 2", category: "Audio", brand: "Apple", image: "APP", identifiers: { brand: "Apple", family: "AirPods" } },
];

export const productVariants: ProductVariant[] = [
  { id: "iphone-17-128", productId: featuredProduct.id, label: "128GB", storage: "128GB", specifications: { storage: "128GB" }, identifiers: {} },
  { id: "iphone-17-256", productId: featuredProduct.id, label: "256GB", storage: "256GB", specifications: { storage: "256GB" }, identifiers: {} },
  { id: "iphone-17-512", productId: featuredProduct.id, label: "512GB", storage: "512GB", specifications: { storage: "512GB" }, identifiers: {} },
];

export const conditionOptions: Condition[] = ["New", "Used - like new", "Used - very good", "Used - good", "Refurbished"];
export const getVariantsForProduct = (productId: string) => productVariants.filter((variant) => variant.productId === productId);

export const offers: Offer[] = [
  { id: "amazon-iphone-17-256", variantId: "iphone-17-256", retailer: { id: "amazon", name: "Amazon", logo: "A", website: "https://www.amazon.com" }, seller: { id: "amazon-retail", retailerId: "amazon", name: "Amazon", sellerType: "retailer" }, price: 799, currency: "USD", condition: "New", shippingCost: 0, delivery: "Free delivery tomorrow", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "30-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
  { id: "best-buy-iphone-17-256", variantId: "iphone-17-256", retailer: { id: "best-buy", name: "Best Buy", logo: "B", website: "https://www.bestbuy.com" }, seller: { id: "best-buy-retail", retailerId: "best-buy", name: "Best Buy", sellerType: "retailer" }, price: 799, currency: "USD", condition: "New", shippingCost: 0, delivery: "Free pickup today", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "15-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
  { id: "ebay-iphone-17-256", variantId: "iphone-17-256", retailer: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" }, seller: { id: "ebay-demo-seller", retailerId: "ebay", name: "Top Rated seller", sellerType: "marketplace_seller" }, price: 749, currency: "USD", condition: "Used - like new", shippingCost: 0, delivery: "Free delivery in 2 days", availability: "Limited stock", warranty: "1-year marketplace warranty", returnPolicy: "30-day seller return terms", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", isDemo: true },
];

export const priceHistory: PricePoint[] = [{ label: "Apr", price: 899 }, { label: "May", price: 879 }, { label: "Jun", price: 849 }, { label: "Jul", price: 829 }, { label: "Aug", price: 799 }, { label: "Today", price: 799 }];
export const demoRecommendations: Recommendation[] = [
  { offerId: "amazon-iphone-17-256", kind: "kelus_pick", reasons: ["Same price as another major retailer", "New condition", "30-day retailer returns", "1-year manufacturer warranty", "Free delivery"], tradeoffs: ["$50 more than the cheapest used alternative"] },
  { offerId: "ebay-iphone-17-256", kind: "cheapest", reasons: ["Save $50", "Used - like new", "Free delivery"], tradeoffs: ["Different retailer warranty and return terms"] },
  { offerId: "best-buy-iphone-17-256", kind: "safest_option", reasons: ["New condition", "Established retailer", "Manufacturer warranty"], tradeoffs: ["15-day retailer returns"] },
];
