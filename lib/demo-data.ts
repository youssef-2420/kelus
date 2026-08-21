import type { Offer, PricePoint, Product, ProductVariant, Retailer, Seller } from "@/types/kelus";

export const marketOptions = [{ id: "us", label: "United States" }] as const;
export const products: Product[] = [
  { id: "apple-iphone-17", slug: "iphone-17", name: "iPhone 17", category: "Smartphone", brand: "Apple", image: "IPH", identifiers: { brand: "Apple", family: "iPhone" } },
  { id: "apple-iphone-17-pro", slug: "iphone-17-pro", name: "iPhone 17 Pro", category: "Smartphone", brand: "Apple", image: "17P", identifiers: { brand: "Apple", family: "iPhone" } },
  { id: "apple-iphone-17-pro-max", slug: "iphone-17-pro-max", name: "iPhone 17 Pro Max", category: "Smartphone", brand: "Apple", image: "17M", identifiers: { brand: "Apple", family: "iPhone" } },
  { id: "apple-macbook-air-m4", slug: "macbook-air-m4", name: "MacBook Air", category: "Laptop", brand: "Apple", image: "MBA", identifiers: { brand: "Apple", family: "MacBook" } },
  { id: "apple-airpods-pro-2", slug: "airpods-pro-2", name: "AirPods Pro", category: "Audio", brand: "Apple", image: "APP", identifiers: { brand: "Apple", family: "AirPods" } },
];
export const featuredProduct = products[0];
export const productVariants: ProductVariant[] = [
  ...["128GB", "256GB", "512GB"].map((storage) => ({ id: `iphone-17-${storage.slice(0, -2)}`, productId: "apple-iphone-17", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB", "1TB"].map((storage) => ({ id: `iphone-17-pro-${storage.toLowerCase()}`, productId: "apple-iphone-17-pro", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB", "1TB"].map((storage) => ({ id: `iphone-17-pro-max-${storage.toLowerCase()}`, productId: "apple-iphone-17-pro-max", label: storage, storage, specifications: { storage }, identifiers: {} })),
  { id: "macbook-air-m4-16-512", productId: "apple-macbook-air-m4", label: "16GB · 512GB", storage: "512GB", specifications: { ram: "16GB", storage: "512GB", processor: "M4" }, identifiers: {} },
  { id: "macbook-air-m4-24-1tb", productId: "apple-macbook-air-m4", label: "24GB · 1TB", storage: "1TB", specifications: { ram: "24GB", storage: "1TB", processor: "M4" }, identifiers: {} },
  { id: "airpods-pro-2-usbc", productId: "apple-airpods-pro-2", label: "USB-C", specifications: { connector: "USB-C" }, identifiers: {} },
];
export const getProductBySlug = (slug: string) => products.find((product) => product.slug === slug);
export const getVariantById = (id?: string) => productVariants.find((variant) => variant.id === id);
export const getVariantsForProduct = (productId: string) => productVariants.filter((variant) => variant.productId === productId);
export const searchProducts = (query: string) => products.filter((product) => `${product.brand} ${product.name}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5);

const retailers: Record<string, Retailer> = { amazon: { id: "amazon", name: "Amazon", logo: "A", website: "https://www.amazon.com" }, bestBuy: { id: "best-buy", name: "Best Buy", logo: "B", website: "https://www.bestbuy.com" }, ebay: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" } };
const sellers: Record<string, Seller> = { amazon: { id: "amazon-retail", retailerId: "amazon", name: "Amazon", sellerType: "retailer" }, bestBuy: { id: "best-buy-retail", retailerId: "best-buy", name: "Best Buy", sellerType: "retailer" }, ebay: { id: "ebay-demo-seller", retailerId: "ebay", name: "Top Rated seller", sellerType: "marketplace_seller" } };

// Seed data is deliberately demo-only. Provider adapters consume this normalized format until live credentials exist.
export const offers: Offer[] = [
  { id: "amazon-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.amazon, seller: sellers.amazon, price: 799, currency: "USD", condition: "new", shippingCost: 0, delivery: "Free delivery tomorrow", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "30-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
  { id: "best-buy-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.bestBuy, seller: sellers.bestBuy, price: 799, currency: "USD", condition: "new", shippingCost: 0, delivery: "Free pickup today", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "15-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
  { id: "ebay-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.ebay, seller: sellers.ebay, price: 749, currency: "USD", condition: "used", shippingCost: 0, delivery: "Free delivery in 2 days", availability: "Limited stock", warranty: "1-year marketplace warranty", returnPolicy: "30-day seller return terms", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
];
export const priceHistory: PricePoint[] = [{ label: "Apr", price: 899 }, { label: "May", price: 879 }, { label: "Jun", price: 849 }, { label: "Jul", price: 829 }, { label: "Aug", price: 799 }, { label: "Today", price: 799 }];
