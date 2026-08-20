import type { Offer, PricePoint, Product } from "@/types/kelus";

export const featuredProduct: Product = {
  slug: "iphone-17",
  name: "iPhone 17",
  category: "Smartphone",
  brand: "Apple",
  image: "IPH",
  priceRange: "$799–$899",
  variants: ["128GB", "256GB", "512GB"],
};

export const products: Product[] = [
  featuredProduct,
  { slug: "iphone-17-pro", name: "iPhone 17 Pro", category: "Smartphone", brand: "Apple", image: "17P", priceRange: "$999–$1,199", variants: ["256GB", "512GB", "1TB"] },
  { slug: "macbook-air-m4", name: "MacBook Air M4", category: "Laptop", brand: "Apple", image: "MBA", priceRange: "$899–$1,199", variants: ["16GB / 256GB", "16GB / 512GB"] },
  { slug: "airpods-pro-2", name: "AirPods Pro 2", category: "Audio", brand: "Apple", image: "APP", priceRange: "$189–$249", variants: ["USB-C"] },
];

export const offers: Offer[] = [
  { id: "amazon", retailer: "Amazon", price: 799, delivery: "Free delivery tomorrow", condition: "New", protection: "1-year manufacturer warranty", sellerNote: "Sold by Amazon", badge: "Kelus Pick", score: 94, returnWindow: "30-day returns" },
  { id: "best-buy", retailer: "Best Buy", price: 799, delivery: "Free pickup today", condition: "New", protection: "1-year manufacturer warranty", sellerNote: "Authorized retailer", badge: "Best protection", score: 92, returnWindow: "15-day returns" },
  { id: "ebay", retailer: "eBay Refurbished", price: 749, delivery: "Free delivery in 2 days", condition: "Used - like new", protection: "1-year Allstate warranty", sellerNote: "Top Rated seller", badge: "Lowest price", score: 87, returnWindow: "30-day returns" },
];

export const priceHistory: PricePoint[] = [
  { label: "Apr", price: 899 }, { label: "May", price: 879 }, { label: "Jun", price: 849 },
  { label: "Jul", price: 829 }, { label: "Aug", price: 799 }, { label: "Today", price: 799 },
];

export const conditionOptions = ["New", "Used - like new", "Used - very good", "Used - good"] as const;
