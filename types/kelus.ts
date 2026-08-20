export type Condition = "New" | "Used - like new" | "Used - very good" | "Used - good";

export type Product = {
  slug: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  priceRange: string;
  variants: string[];
};

export type Offer = {
  id: string;
  retailer: string;
  price: number;
  delivery: string;
  condition: Condition;
  protection: string;
  sellerNote: string;
  badge?: "Kelus Pick" | "Lowest price" | "Best protection";
  score: number;
  returnWindow: string;
};

export type PricePoint = { label: string; price: number };
