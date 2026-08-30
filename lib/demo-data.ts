import type { Offer, PricePoint, Product, ProductVariant, Retailer, Seller } from "@/types/kelus";

export const marketOptions = [{ id: "us", label: "United States" }] as const;
const product = (
  id: string,
  slug: string,
  name: string,
  category: string,
  brand: string,
  image: string,
  attribute: Product["searchAttribute"]["type"],
  validVariantIds: string[],
  aliases: string[] = [],
  fromPrice = 0,
): Product => ({
  id,
  slug,
  name,
  category,
  brand,
  image,
  aliases,
  identifiers: { brand, family: name.split(" ")[0] },
  searchAttribute: { type: attribute, validVariantIds },
  searchPreview: { fromPrice, offerCount: 0, isDemo: true },
});

export const products: Product[] = [
  product("apple-iphone-17", "iphone-17", "iPhone 17", "Smartphone", "Apple", "IPH", "storage", ["iphone-17-128", "iphone-17-256", "iphone-17-512"], ["apple iphone 17", "iphone seventeen"], 799),
  product("apple-iphone-17-pro", "iphone-17-pro", "iPhone 17 Pro", "Smartphone", "Apple", "17P", "storage", ["iphone-17-pro-256gb", "iphone-17-pro-512gb", "iphone-17-pro-1tb"], ["apple iphone 17 pro", "iphone seventeen pro"], 999),
  product("apple-iphone-17-pro-max", "iphone-17-pro-max", "iPhone 17 Pro Max", "Smartphone", "Apple", "17M", "storage", ["iphone-17-pro-max-256gb", "iphone-17-pro-max-512gb", "iphone-17-pro-max-1tb"], ["apple iphone 17 pro max", "iphone seventeen pro max"], 1199),
  product("apple-iphone-16", "iphone-16", "iPhone 16", "Smartphone", "Apple", "16", "storage", ["iphone-16-128", "iphone-16-256"], ["apple iphone 16"], 699),
  product("apple-iphone-16-pro", "iphone-16-pro", "iPhone 16 Pro", "Smartphone", "Apple", "16P", "storage", ["iphone-16-pro-128", "iphone-16-pro-256"], ["apple iphone 16 pro"], 999),
  product("apple-iphone-16-pro-max", "iphone-16-pro-max", "iPhone 16 Pro Max", "Smartphone", "Apple", "16M", "storage", ["iphone-16-pro-max-256", "iphone-16-pro-max-512"], ["apple iphone 16 pro max"], 1199),
  product("samsung-galaxy-s26", "galaxy-s26", "Galaxy S26", "Smartphone", "Samsung", "S26", "storage", ["galaxy-s26-128", "galaxy-s26-256"], ["samsung s26", "s26"], 799),
  product("samsung-galaxy-s26-ultra", "galaxy-s26-ultra", "Galaxy S26 Ultra", "Smartphone", "Samsung", "S26U", "storage", ["galaxy-s26-ultra-256", "galaxy-s26-ultra-512"], ["samsung s26 ultra", "s26 ultra"], 1199),
  product("samsung-galaxy-z-fold-7", "galaxy-z-fold-7", "Galaxy Z Fold7", "Smartphone", "Samsung", "ZF7", "storage", ["galaxy-z-fold-7-256", "galaxy-z-fold-7-512"], ["z fold 7", "samsung fold 7"], 1799),
  product("google-pixel-10", "pixel-10", "Pixel 10", "Smartphone", "Google", "PX10", "storage", ["pixel-10-128", "pixel-10-256"], ["google pixel 10"], 799),
  product("google-pixel-10-pro", "pixel-10-pro", "Pixel 10 Pro", "Smartphone", "Google", "P10P", "storage", ["pixel-10-pro-128", "pixel-10-pro-256"], ["google pixel 10 pro"], 999),
  product("google-pixel-10-pro-xl", "pixel-10-pro-xl", "Pixel 10 Pro XL", "Smartphone", "Google", "P10X", "storage", ["pixel-10-pro-xl-256", "pixel-10-pro-xl-512"], ["google pixel 10 pro xl"], 1099),
  product("apple-macbook-air-m4", "macbook-air-m4", "MacBook Air M4", "Laptop", "Apple", "MBA", "configuration", ["macbook-air-m4-16-512", "macbook-air-m4-24-1tb"], ["macbook air", "m4 air"], 999),
  product("apple-macbook-pro-14-m4", "macbook-pro-14-m4", "MacBook Pro 14-inch M4", "Laptop", "Apple", "MBP", "configuration", ["macbook-pro-14-m4-16-512", "macbook-pro-14-m4-pro-24-1tb"], ["macbook pro 14", "14 inch macbook pro"], 1599),
  product("apple-macbook-pro-16-m4", "macbook-pro-16-m4", "MacBook Pro 16-inch M4", "Laptop", "Apple", "M16", "configuration", ["macbook-pro-16-m4-pro-24-512", "macbook-pro-16-m4-max-36-1tb"], ["macbook pro 16", "16 inch macbook pro"], 2499),
  product("dell-xps-13", "dell-xps-13", "XPS 13", "Laptop", "Dell", "XPS", "configuration", ["dell-xps-13-16-512", "dell-xps-13-32-1tb"], ["dell xps13"], 1199),
  product("hp-spectre-x360-14", "hp-spectre-x360-14", "Spectre x360 14", "Laptop", "HP", "HPX", "configuration", ["hp-spectre-x360-14-16-1tb"], ["hp spectre 14"], 1399),
  product("lenovo-thinkpad-x1-carbon", "thinkpad-x1-carbon", "ThinkPad X1 Carbon", "Laptop", "Lenovo", "X1C", "configuration", ["thinkpad-x1-carbon-16-512", "thinkpad-x1-carbon-32-1tb"], ["lenovo x1 carbon"], 1599),
  product("apple-ipad-pro-11-m4", "ipad-pro-11-m4", "iPad Pro 11-inch M4", "Tablet", "Apple", "IPD", "storage", ["ipad-pro-11-m4-256", "ipad-pro-11-m4-512"], ["ipad pro 11", "m4 ipad pro 11"], 999),
  product("apple-ipad-pro-13-m4", "ipad-pro-13-m4", "iPad Pro 13-inch M4", "Tablet", "Apple", "I13", "storage", ["ipad-pro-13-m4-256", "ipad-pro-13-m4-512"], ["ipad pro 13", "m4 ipad pro 13"], 1299),
  product("apple-ipad-air-11-m3", "ipad-air-11-m3", "iPad Air 11-inch M3", "Tablet", "Apple", "AIR", "storage", ["ipad-air-11-m3-128", "ipad-air-11-m3-256"], ["ipad air 11"], 599),
  product("apple-watch-series-11", "apple-watch-series-11", "Apple Watch Series 11", "Wearable", "Apple", "AWS", "configuration", ["apple-watch-series-11-42mm-gps", "apple-watch-series-11-46mm-gps"], ["watch series 11"], 399),
  product("apple-watch-ultra-3", "apple-watch-ultra-3", "Apple Watch Ultra 3", "Wearable", "Apple", "AWU", "configuration", ["apple-watch-ultra-3-49mm"], ["watch ultra 3"], 799),
  product("apple-airpods-pro-2", "airpods-pro-2", "AirPods Pro", "Audio", "Apple", "APP", "none", ["airpods-pro-2-usbc"], ["airpods pro 2", "airpods pro usb c"], 249),
  product("apple-airpods-4", "airpods-4", "AirPods 4", "Audio", "Apple", "AP4", "configuration", ["airpods-4-standard", "airpods-4-anc"], ["airpods fourth generation"], 129),
  product("sony-wh-1000xm6", "sony-wh-1000xm6", "WH-1000XM6", "Audio", "Sony", "XM6", "none", ["sony-wh-1000xm6"], ["sony xm6", "sony noise cancelling headphones"], 449),
  product("sony-wf-1000xm5", "sony-wf-1000xm5", "WF-1000XM5", "Audio", "Sony", "X5", "none", ["sony-wf-1000xm5"], ["sony xm5 earbuds"], 299),
  product("bose-quietcomfort-ultra-headphones", "bose-quietcomfort-ultra-headphones", "QuietComfort Ultra Headphones", "Audio", "Bose", "BQC", "none", ["bose-quietcomfort-ultra-headphones"], ["bose qc ultra headphones"], 429),
  product("bose-quietcomfort-ultra-earbuds", "bose-quietcomfort-ultra-earbuds", "QuietComfort Ultra Earbuds", "Audio", "Bose", "BQE", "none", ["bose-quietcomfort-ultra-earbuds"], ["bose qc ultra earbuds"], 299),
  product("beats-studio-pro", "beats-studio-pro", "Studio Pro", "Audio", "Beats", "BSP", "none", ["beats-studio-pro"], ["beats headphones"], 349),
  product("sony-playstation-5-slim", "playstation-5-slim", "PlayStation 5 Slim", "Console", "Sony", "PS5", "edition", ["playstation-5-slim-disc", "playstation-5-slim-digital"], ["ps5 slim", "playstation five slim"], 449),
  product("sony-playstation-5-pro", "playstation-5-pro", "PlayStation 5 Pro", "Console", "Sony", "P5P", "configuration", ["playstation-5-pro-2tb"], ["ps5 pro"], 699),
  product("microsoft-xbox-series-x", "xbox-series-x", "Xbox Series X", "Console", "Microsoft", "XSX", "configuration", ["xbox-series-x-1tb", "xbox-series-x-2tb"], ["xbox x"], 499),
  product("microsoft-xbox-series-s", "xbox-series-s", "Xbox Series S", "Console", "Microsoft", "XSS", "configuration", ["xbox-series-s-512", "xbox-series-s-1tb"], ["xbox s"], 299),
  product("nintendo-switch-2", "nintendo-switch-2", "Nintendo Switch 2", "Console", "Nintendo", "NS2", "none", ["nintendo-switch-2"], ["switch 2"], 449),
  product("nintendo-switch-oled", "nintendo-switch-oled", "Nintendo Switch OLED", "Console", "Nintendo", "NSO", "none", ["nintendo-switch-oled"], ["switch oled"], 349),
];
export const featuredProduct = products[0];
export const productVariants: ProductVariant[] = [
  ...["128GB", "256GB", "512GB"].map((storage) => ({ id: `iphone-17-${storage.slice(0, -2)}`, productId: "apple-iphone-17", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB", "1TB"].map((storage) => ({ id: `iphone-17-pro-${storage.toLowerCase()}`, productId: "apple-iphone-17-pro", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB", "1TB"].map((storage) => ({ id: `iphone-17-pro-max-${storage.toLowerCase()}`, productId: "apple-iphone-17-pro-max", label: storage, storage, specifications: { storage }, identifiers: {} })),
  { id: "macbook-air-m4-16-512", productId: "apple-macbook-air-m4", label: "16GB · 512GB", storage: "512GB", specifications: { ram: "16GB", storage: "512GB", processor: "M4" }, identifiers: {} },
  { id: "macbook-air-m4-24-1tb", productId: "apple-macbook-air-m4", label: "24GB · 1TB", storage: "1TB", specifications: { ram: "24GB", storage: "1TB", processor: "M4" }, identifiers: {} },
  { id: "airpods-pro-2-usbc", productId: "apple-airpods-pro-2", label: "USB-C", specifications: { connector: "USB-C" }, identifiers: {} },
  ...["128GB", "256GB"].map((storage) => ({ id: `iphone-16-${storage.slice(0, -2)}`, productId: "apple-iphone-16", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `iphone-16-pro-${storage.slice(0, -2)}`, productId: "apple-iphone-16-pro", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB"].map((storage) => ({ id: `iphone-16-pro-max-${storage.slice(0, -2)}`, productId: "apple-iphone-16-pro-max", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `galaxy-s26-${storage.slice(0, -2)}`, productId: "samsung-galaxy-s26", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB"].map((storage) => ({ id: `galaxy-s26-ultra-${storage.slice(0, -2)}`, productId: "samsung-galaxy-s26-ultra", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB"].map((storage) => ({ id: `galaxy-z-fold-7-${storage.slice(0, -2)}`, productId: "samsung-galaxy-z-fold-7", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `pixel-10-${storage.slice(0, -2)}`, productId: "google-pixel-10", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `pixel-10-pro-${storage.slice(0, -2)}`, productId: "google-pixel-10-pro", label: storage, storage, specifications: { storage }, identifiers: {} })),
  ...["256GB", "512GB"].map((storage) => ({ id: `pixel-10-pro-xl-${storage.slice(0, -2)}`, productId: "google-pixel-10-pro-xl", label: storage, storage, specifications: { storage }, identifiers: {} })),
  { id: "macbook-pro-14-m4-16-512", productId: "apple-macbook-pro-14-m4", label: "M4 · 16GB · 512GB", storage: "512GB", specifications: { ram: "16GB", storage: "512GB", processor: "M4" }, identifiers: {} },
  { id: "macbook-pro-14-m4-pro-24-1tb", productId: "apple-macbook-pro-14-m4", label: "M4 Pro · 24GB · 1TB", storage: "1TB", specifications: { ram: "24GB", storage: "1TB", processor: "M4 Pro" }, identifiers: {} },
  { id: "macbook-pro-16-m4-pro-24-512", productId: "apple-macbook-pro-16-m4", label: "M4 Pro · 24GB · 512GB", storage: "512GB", specifications: { ram: "24GB", storage: "512GB", processor: "M4 Pro" }, identifiers: {} },
  { id: "macbook-pro-16-m4-max-36-1tb", productId: "apple-macbook-pro-16-m4", label: "M4 Max · 36GB · 1TB", storage: "1TB", specifications: { ram: "36GB", storage: "1TB", processor: "M4 Max" }, identifiers: {} },
  { id: "dell-xps-13-16-512", productId: "dell-xps-13", label: "16GB · 512GB", storage: "512GB", specifications: { ram: "16GB", storage: "512GB" }, identifiers: {} },
  { id: "dell-xps-13-32-1tb", productId: "dell-xps-13", label: "32GB · 1TB", storage: "1TB", specifications: { ram: "32GB", storage: "1TB" }, identifiers: {} },
  { id: "hp-spectre-x360-14-16-1tb", productId: "hp-spectre-x360-14", label: "16GB · 1TB", storage: "1TB", specifications: { ram: "16GB", storage: "1TB" }, identifiers: {} },
  { id: "thinkpad-x1-carbon-16-512", productId: "lenovo-thinkpad-x1-carbon", label: "16GB · 512GB", storage: "512GB", specifications: { ram: "16GB", storage: "512GB" }, identifiers: {} },
  { id: "thinkpad-x1-carbon-32-1tb", productId: "lenovo-thinkpad-x1-carbon", label: "32GB · 1TB", storage: "1TB", specifications: { ram: "32GB", storage: "1TB" }, identifiers: {} },
  ...["256GB", "512GB"].map((storage) => ({ id: `ipad-pro-11-m4-${storage.slice(0, -2)}`, productId: "apple-ipad-pro-11-m4", label: storage, storage, specifications: { storage, processor: "M4" }, identifiers: {} })),
  ...["256GB", "512GB"].map((storage) => ({ id: `ipad-pro-13-m4-${storage.slice(0, -2)}`, productId: "apple-ipad-pro-13-m4", label: storage, storage, specifications: { storage, processor: "M4" }, identifiers: {} })),
  ...["128GB", "256GB"].map((storage) => ({ id: `ipad-air-11-m3-${storage.slice(0, -2)}`, productId: "apple-ipad-air-11-m3", label: storage, storage, specifications: { storage, processor: "M3" }, identifiers: {} })),
  { id: "apple-watch-series-11-42mm-gps", productId: "apple-watch-series-11", label: "42mm GPS", specifications: { size: "42mm", connectivity: "GPS" }, identifiers: {} },
  { id: "apple-watch-series-11-46mm-gps", productId: "apple-watch-series-11", label: "46mm GPS", specifications: { size: "46mm", connectivity: "GPS" }, identifiers: {} },
  { id: "apple-watch-ultra-3-49mm", productId: "apple-watch-ultra-3", label: "49mm", specifications: { size: "49mm" }, identifiers: {} },
  { id: "airpods-4-standard", productId: "apple-airpods-4", label: "Standard", specifications: { model: "Standard" }, identifiers: {} },
  { id: "airpods-4-anc", productId: "apple-airpods-4", label: "Active Noise Cancellation", specifications: { model: "ANC" }, identifiers: {} },
  { id: "sony-wh-1000xm6", productId: "sony-wh-1000xm6", label: "Standard", specifications: {}, identifiers: {} },
  { id: "sony-wf-1000xm5", productId: "sony-wf-1000xm5", label: "Standard", specifications: {}, identifiers: {} },
  { id: "bose-quietcomfort-ultra-headphones", productId: "bose-quietcomfort-ultra-headphones", label: "Standard", specifications: {}, identifiers: {} },
  { id: "bose-quietcomfort-ultra-earbuds", productId: "bose-quietcomfort-ultra-earbuds", label: "Standard", specifications: {}, identifiers: {} },
  { id: "beats-studio-pro", productId: "beats-studio-pro", label: "Standard", specifications: {}, identifiers: {} },
  { id: "playstation-5-slim-disc", productId: "sony-playstation-5-slim", label: "Disc Edition", specifications: { edition: "Disc" }, identifiers: {} },
  { id: "playstation-5-slim-digital", productId: "sony-playstation-5-slim", label: "Digital Edition", specifications: { edition: "Digital" }, identifiers: {} },
  { id: "playstation-5-pro-2tb", productId: "sony-playstation-5-pro", label: "2TB Digital Console", storage: "2TB", specifications: { storage: "2TB", edition: "Digital" }, identifiers: {} },
  { id: "xbox-series-x-1tb", productId: "microsoft-xbox-series-x", label: "1TB", storage: "1TB", specifications: { storage: "1TB" }, identifiers: {} },
  { id: "xbox-series-x-2tb", productId: "microsoft-xbox-series-x", label: "2TB", storage: "2TB", specifications: { storage: "2TB" }, identifiers: {} },
  { id: "xbox-series-s-512", productId: "microsoft-xbox-series-s", label: "512GB", storage: "512GB", specifications: { storage: "512GB" }, identifiers: {} },
  { id: "xbox-series-s-1tb", productId: "microsoft-xbox-series-s", label: "1TB", storage: "1TB", specifications: { storage: "1TB" }, identifiers: {} },
  { id: "nintendo-switch-2", productId: "nintendo-switch-2", label: "Standard", specifications: {}, identifiers: {} },
  { id: "nintendo-switch-oled", productId: "nintendo-switch-oled", label: "OLED", specifications: { edition: "OLED" }, identifiers: {} },
];
export const getProductBySlug = (slug: string) => products.find((product) => product.slug === slug);
export const getVariantById = (id?: string) => productVariants.find((variant) => variant.id === id);
export const getVariantsForProduct = (productId: string) => productVariants.filter((variant) => variant.productId === productId);
const normalizeQuery = (value: string) => value.toLowerCase().replace(/([a-z])([0-9])/g, "$1 $2").replace(/([0-9])([a-z])/g, "$1 $2").replace(/[^a-z0-9]+/g, " ").trim();
const condensedQuery = (value: string) => normalizeQuery(value).replace(/\s/g, "");
const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[right.length];
};
const scoreProduct = (query: string, product: Product) => {
  const haystack = [product.brand, product.name, product.slug, product.category, ...(product.aliases ?? [])].map(normalizeQuery);
  if (!query) return 0;
  if (haystack.some((value) => value === query)) return 100;
  if (haystack.some((value) => condensedQuery(value) === condensedQuery(query))) return 95;
  const embedded = haystack.filter((value) => value.length >= 4 && query.includes(value));
  if (embedded.length) return 75 + Math.min(19, Math.max(...embedded.map((value) => condensedQuery(value).length)));
  if (haystack.some((value) => value.startsWith(query))) return 80;
  if (haystack.some((value) => value.includes(query))) return 60;
  const compactQuery = condensedQuery(query);
  if (compactQuery.length >= 6 && haystack.some((value) => editDistance(compactQuery, condensedQuery(value)) <= 1)) return 90;
  const queryTokens = query.split(" ").filter(Boolean);
  const fuzzyPhraseLengths = haystack.flatMap((value) => {
    const phraseTokens = value.split(" ").filter(Boolean);
    if (phraseTokens.length < 2 || queryTokens.length < phraseTokens.length) return [];
    const matched = queryTokens.some((_, index) => {
      const candidate = queryTokens.slice(index, index + phraseTokens.length).join("");
      return candidate.length >= 6 && editDistance(candidate, condensedQuery(value)) <= 1;
    });
    return matched ? [condensedQuery(value).length] : [];
  });
  if (fuzzyPhraseLengths.length) return 70 + Math.min(19, Math.max(...fuzzyPhraseLengths));
  const tokens = query.split(" ").filter(Boolean);
  return tokens.length && tokens.every((token) => haystack.some((value) => value.includes(token))) ? 40 + tokens.length : 0;
};
const rankedProducts = (query: string) => {
  const normalized = normalizeQuery(query);
  return products
    .map((product) => ({ product, score: scoreProduct(normalized, product) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
};
export const searchProducts = (query: string) => rankedProducts(query).slice(0, 8).map((entry) => entry.product);
const categoryIntent: Array<{ category: string; terms: string[] }> = [
  { category: "Smartphone", terms: ["phone", "smartphone", "mobile"] },
  { category: "Laptop", terms: ["laptop", "notebook", "computer"] },
  { category: "Tablet", terms: ["tablet", "ipad"] },
  { category: "Wearable", terms: ["watch", "smartwatch", "wearable"] },
  { category: "Audio", terms: ["headphone", "headphones", "earbud", "earbuds", "audio"] },
  { category: "Console", terms: ["console", "gaming", "playstation", "xbox", "nintendo"] },
];
export const suggestSupportedProducts = (query: string, limit = 3) => {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];
  const brandMatches = products.filter((item) => normalized.split(" ").includes(normalizeQuery(item.brand)));
  if (brandMatches.length) return brandMatches.slice(0, limit);
  const intent = categoryIntent.find((item) => item.terms.some((term) => normalized.split(" ").includes(term)));
  return intent ? products.filter((item) => item.category === intent.category).slice(0, limit) : [];
};
export type ProductSearchResolution = { status: "resolved"; product: Product } | { status: "ambiguous"; candidates: Product[] } | { status: "unsupported"; candidates: [] };
export const resolveProductSearch = (query: string): ProductSearchResolution => {
  const ranked = rankedProducts(query);
  if (!ranked.length) return { status: "unsupported", candidates: [] };
  const [first, second] = ranked;
  if (first.score < 74 || (second && first.score - second.score < 2)) return { status: "ambiguous", candidates: ranked.slice(0, 8).map((entry) => entry.product) };
  return { status: "resolved", product: first.product };
};

const retailers: Record<string, Retailer> = { amazon: { id: "amazon", name: "Amazon", logo: "A", website: "https://www.amazon.com" }, bestBuy: { id: "best-buy", name: "Best Buy", logo: "B", website: "https://www.bestbuy.com" }, ebay: { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" } };
const sellers: Record<string, Seller> = { amazon: { id: "amazon-retail", retailerId: "amazon", name: "Amazon", sellerType: "retailer" }, bestBuy: { id: "best-buy-retail", retailerId: "best-buy", name: "Best Buy", sellerType: "retailer" }, ebay: { id: "ebay-demo-seller", retailerId: "ebay", name: "Top Rated seller", sellerType: "marketplace_seller" } };

// Seed data is deliberately demo-only. Provider adapters consume this normalized format until live credentials exist.
export const offers: Offer[] = [
  { id: "amazon-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.amazon, seller: sellers.amazon, price: 799, currency: "USD", condition: "new", shippingCost: 0, delivery: "Free delivery tomorrow", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "30-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
  { id: "best-buy-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.bestBuy, seller: sellers.bestBuy, price: 799, currency: "USD", condition: "new", shippingCost: 0, delivery: "Free pickup today", availability: "In stock", warranty: "1-year manufacturer warranty", returnPolicy: "15-day retailer returns", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
  { id: "ebay-iphone-17-256", productId: "apple-iphone-17", variantId: "iphone-17-256", retailer: retailers.ebay, seller: sellers.ebay, price: 749, currency: "USD", condition: "used", shippingCost: 0, delivery: "Free delivery in 2 days", availability: "Limited stock", warranty: "1-year marketplace warranty", returnPolicy: "30-day seller return terms", affiliateUrl: null, lastUpdated: "2026-08-20T12:00:00Z", dataSource: "demo" },
];
export const priceHistory: PricePoint[] = [{ label: "Apr", price: 899 }, { label: "May", price: 879 }, { label: "Jun", price: 849 }, { label: "Jul", price: 829 }, { label: "Aug", price: 799 }, { label: "Today", price: 799 }];
