import type { Offer, PricePoint, Product, ProductVariant, Retailer, Seller } from "@/types/kelus";

export const marketOptions = [{ id: "ma", label: "Morocco" }] as const;
export const products: Product[] = [
  { id: "apple-iphone-13", slug: "iphone-13", name: "iPhone 13", category: "Smartphone", brand: "Apple", image: "IPH", identifiers: { brand: "Apple", family: "iPhone" }, searchPreview: { fromPrice: 3200, offerCount: 3, isDemo: true } },
  { id: "samsung-galaxy-s22", slug: "galaxy-s22", name: "Samsung Galaxy S22", category: "Smartphone", brand: "Samsung", image: "SGS", identifiers: { brand: "Samsung", family: "Galaxy" }, searchPreview: { fromPrice: 2800, offerCount: 2, isDemo: true } },
  { id: "apple-macbook-air-m1", slug: "macbook-air-m1", name: "MacBook Air M1", category: "Laptop", brand: "Apple", image: "MBA", identifiers: { brand: "Apple", family: "MacBook" }, searchPreview: { fromPrice: 7200, offerCount: 2, isDemo: true } },
  { id: "sony-wh1000xm5", slug: "sony-headphones", name: "Sony WH-1000XM5", category: "Audio", brand: "Sony", image: "SNY", identifiers: { brand: "Sony", family: "WH-1000X" }, searchPreview: { fromPrice: 2899, offerCount: 2, isDemo: true } },
  { id: "canon-eos-r50", slug: "canon-camera", name: "Canon EOS R50", category: "Camera", brand: "Canon", image: "CNO", identifiers: { brand: "Canon", family: "EOS" }, searchPreview: { fromPrice: 8999, offerCount: 1, isDemo: true } },
];
export const featuredProduct = products[0];
export const productVariants: ProductVariant[] = [
  ...["128GB", "256GB"].map((storage) => ({ id: `iphone-13-${storage.slice(0, -2)}`, productId: "apple-iphone-13", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `galaxy-s22-${storage.slice(0, -2)}`, productId: "samsung-galaxy-s22", label: storage, storage, specifications: { storage }, identifiers: {} })),
  { id: "macbook-air-m1-256", productId: "apple-macbook-air-m1", label: "256GB SSD", storage: "256GB", specifications: { storage: "256GB", ram: "8GB" }, identifiers: {} },
  { id: "macbook-air-m1-512", productId: "apple-macbook-air-m1", label: "512GB SSD", storage: "512GB", specifications: { storage: "512GB", ram: "8GB" }, identifiers: {} },
  { id: "sony-wh1000xm5", productId: "sony-wh1000xm5", label: "Standard", specifications: {}, identifiers: {} },
  { id: "canon-eos-r50", productId: "canon-eos-r50", label: "Body Only", specifications: {}, identifiers: {} },
];
export const getProductBySlug = (slug: string) => products.find((product) => product.slug === slug);
export const getVariantById = (id?: string) => productVariants.find((variant) => variant.id === id);
export const getVariantsForProduct = (productId: string) => productVariants.filter((variant) => variant.productId === productId);
export const searchProducts = (query: string) => products.filter((product) => `${product.brand} ${product.name}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5);

const retailers: Record<string, Retailer> = { 
  jumia: { id: "jumia", name: "Jumia.ma", logo: "J", website: "https://www.jumia.ma" }, 
  avito: { id: "avito", name: "Avito.ma", logo: "A", website: "https://www.avito.ma" }
};
const sellers: Record<string, Seller> = { 
  jumia: { id: "jumia-official", retailerId: "jumia", name: "Jumia Official Store", sellerType: "retailer" }, 
  avito: { id: "avito-seller", retailerId: "avito", name: "Verified Seller", sellerType: "marketplace_seller" }
};

export const offers: Offer[] = [
  { id: "jumia-iphone-13-256", productId: "apple-iphone-13", variantId: "iphone-13-256", retailer: retailers.jumia, seller: sellers.jumia, price: 5499, currency: "MAD", condition: "new", shippingCost: 0, delivery: "Free delivery in Casablanca", availability: "In stock", warranty: "1-year warranty", returnPolicy: "14-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
  { id: "avito-iphone-13-256", productId: "apple-iphone-13", variantId: "iphone-13-256", retailer: retailers.avito, seller: sellers.avito, price: 3200, currency: "MAD", condition: "used", shippingCost: 150, delivery: "Delivery in 2-3 days", availability: "Limited stock", warranty: "Seller protection", returnPolicy: "7-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
  { id: "jumia-galaxy-s22-256", productId: "samsung-galaxy-s22", variantId: "galaxy-s22-256", retailer: retailers.jumia, seller: sellers.jumia, price: 4999, currency: "MAD", condition: "new", shippingCost: 0, delivery: "Free delivery in Casablanca", availability: "In stock", warranty: "1-year warranty", returnPolicy: "14-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
  { id: "avito-galaxy-s22-256", productId: "samsung-galaxy-s22", variantId: "galaxy-s22-256", retailer: retailers.avito, seller: sellers.avito, price: 2800, currency: "MAD", condition: "used", shippingCost: 150, delivery: "Delivery in 2-3 days", availability: "In stock", warranty: "Seller protection", returnPolicy: "7-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
  { id: "jumia-macbook-m1-512", productId: "apple-macbook-air-m1", variantId: "macbook-air-m1-512", retailer: retailers.jumia, seller: sellers.jumia, price: 12999, currency: "MAD", condition: "new", shippingCost: 0, delivery: "Free delivery nationwide", availability: "In stock", warranty: "1-year warranty", returnPolicy: "14-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
  { id: "avito-macbook-m1-512", productId: "apple-macbook-air-m1", variantId: "macbook-air-m1-512", retailer: retailers.avito, seller: sellers.avito, price: 7200, currency: "MAD", condition: "used", shippingCost: 200, delivery: "Pickup in Rabat", availability: "In stock", warranty: "Seller guarantee", returnPolicy: "5-day returns", affiliateUrl: null, lastUpdated: "2026-08-23T12:00:00Z", dataSource: "demo" },
];
export const priceHistory: PricePoint[] = [
  { label: "Apr", price: 5900 }, 
  { label: "May", price: 5800 }, 
  { label: "Jun", price: 5700 }, 
  { label: "Jul", price: 5600 }, 
  { label: "Aug", price: 5500 }, 
  { label: "Today", price: 5499 }
];
