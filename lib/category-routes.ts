import { getProductsByCategory, productCategories } from "./demo-data.ts";

export const categoryHubs = [
  { slug: "smartphones", label: "Smartphones", category: "Smartphone", description: "Compare exact iPhone, Galaxy, and Pixel configurations with validated live eBay offers." },
  { slug: "laptops", label: "Laptops", category: "Laptop", description: "Find the smartest MacBook, XPS, Spectre, and ThinkPad offer after Kelus checks configuration and seller evidence." },
  { slug: "tablets", label: "Tablets", category: "Tablet", description: "Compare iPad Pro and iPad Air storage options with known totals and seller trust signals." },
  { slug: "wearables", label: "Wearables", category: "Wearable", description: "Track Apple Watch Series and Ultra configurations with validated marketplace pricing." },
  { slug: "audio", label: "Audio", category: "Audio", description: "Compare AirPods, Sony, Bose, and Beats offers with shipping and return terms included." },
  { slug: "consoles", label: "Consoles", category: "Console", description: "See which PlayStation, Xbox, and Nintendo listing is actually worth buying." },
] as const;

export type CategoryHubSlug = (typeof categoryHubs)[number]["slug"];

export function getCategoryHub(slug: string) {
  return categoryHubs.find((hub) => hub.slug === slug);
}

export function getCategoryHubProducts(slug: string) {
  const hub = getCategoryHub(slug);
  if (!hub) return [];
  return getProductsByCategory(hub.category);
}

export function isKnownCategorySlug(slug: string): slug is CategoryHubSlug {
  return categoryHubs.some((hub) => hub.slug === slug);
}

export function categoryHubPath(slug: CategoryHubSlug) {
  return `/category/${slug}`;
}

export function allCategoryHubPaths() {
  return categoryHubs.map((hub) => categoryHubPath(hub.slug));
}

export function categoryLabelForProductCategory(category: (typeof productCategories)[number]) {
  return categoryHubs.find((hub) => hub.category === category)?.label ?? category;
}
