import snapshots from "../data/bundled-product-intelligence-snapshots.json" with { type: "json" };
import { getProductBySlug, getVariantById, products } from "./demo-data.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { ConditionFilter, Offer, OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { catalogSnapshotTargetKey } from "./catalog-snapshot-targets.ts";
import { getRecommendation } from "../services/recommendations.ts";

const bundledSnapshots = snapshots as Record<string, OfferSearchResult>;

function lowestKnownTotal(offers: Offer[]) {
  return offers.reduce<number | null>((best, offer) => {
    if (offer.dataSource !== "live") return best;
    const total = offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
    if (total === null) return best;
    return best === null || total < best ? total : best;
  }, null);
}

function summarizeSnapshot(snapshot: OfferSearchResult) {
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  const recommendation = getRecommendation(liveOffers, "kelus_pick");
  const pick = liveOffers.find((offer) => offer.id === recommendation?.offerId) ?? liveOffers[0];
  return {
    liveOffers,
    fromPrice: lowestKnownTotal(liveOffers),
    pickPrice: pick
      ? pick.shippingCostKnown === false ? pick.price : pick.price + pick.shippingCost
      : null,
    listingImageUrl: (pick?.imageUrl ? pick : liveOffers.find((offer) => offer.imageUrl))?.imageUrl,
  };
}

function parseSnapshotKey(key: string) {
  const [productSlug, variantId, condition, market] = key.split(":");
  if (!productSlug || !variantId || !condition || market !== "us") return null;
  return { productSlug, variantId, condition: condition as ConditionFilter, market: "us" as const };
}

export function readBundledSnapshot(criteria: SearchCriteria) {
  return bundledSnapshots[catalogSnapshotTargetKey(criteria)] ?? null;
}

export function hasBundledSnapshot(criteria: SearchCriteria) {
  const snapshot = readBundledSnapshot(criteria);
  return Boolean(snapshot?.offers.some((offer) => offer.dataSource === "live"));
}

export type BundledShowcase = {
  productSlug: string;
  productName: string;
  brand: string;
  variantLabel: string;
  condition: ConditionFilter;
  href: string;
  fromPrice: number;
  pickPrice?: number;
  offerCount: number;
  lastUpdated?: string;
  listingImageUrl?: string;
};

export type ProductListingPreview = {
  productSlug: string;
  productName: string;
  brand: string;
  category: string;
  image: string;
  href: string;
  variantLabel: string;
  condition: ConditionFilter;
  fromPrice: number;
  pickPrice?: number;
  offerCount: number;
  live: boolean;
  lastUpdated?: string;
  listingImageUrl?: string;
};

function toShowcase(key: string, snapshot: OfferSearchResult): BundledShowcase | null {
  const parsed = parseSnapshotKey(key);
  if (!parsed) return null;
  const product = getProductBySlug(parsed.productSlug);
  const variant = getVariantById(parsed.variantId);
  if (!product || !variant) return null;
  const { liveOffers, fromPrice, pickPrice, listingImageUrl } = summarizeSnapshot(snapshot);
  if (fromPrice === null) return null;
  return {
    productSlug: parsed.productSlug,
    productName: product.name,
    brand: product.brand,
    variantLabel: variant.label,
    condition: parsed.condition,
    href: canonicalProductPath(parsed),
    fromPrice,
    pickPrice: pickPrice ?? undefined,
    offerCount: liveOffers.length,
    lastUpdated: snapshot.lastUpdated,
    listingImageUrl,
  };
}

let showcasesCache: BundledShowcase[] | undefined;

function allBundledShowcases() {
  if (!showcasesCache) {
    showcasesCache = Object.entries(bundledSnapshots)
      .flatMap(([key, snapshot]) => {
        const showcase = toShowcase(key, snapshot);
        return showcase ? [showcase] : [];
      })
      .sort((left, right) => left.fromPrice - right.fromPrice);
  }
  return showcasesCache;
}

export function listBundledShowcases(limit = 6): BundledShowcase[] {
  return allBundledShowcases().slice(0, Math.max(1, limit));
}

export function formatFromPrice(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

let productPreviewsCache: Map<string, ProductListingPreview> | undefined;

function productPreviewIndex() {
  if (productPreviewsCache) return productPreviewsCache;
  const bestByProduct = new Map<string, BundledShowcase>();
  for (const showcase of allBundledShowcases()) {
    if (!bestByProduct.has(showcase.productSlug)) bestByProduct.set(showcase.productSlug, showcase);
  }
  productPreviewsCache = new Map();
  for (const product of products) {
    const best = bestByProduct.get(product.slug);
    if (best) {
      productPreviewsCache.set(product.slug, {
        productSlug: product.slug,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        image: product.image,
        href: best.href,
        variantLabel: best.variantLabel,
        condition: best.condition,
        fromPrice: best.fromPrice,
        pickPrice: best.pickPrice,
        offerCount: best.offerCount,
        live: true,
        lastUpdated: best.lastUpdated,
        listingImageUrl: best.listingImageUrl,
      });
      continue;
    }
    const variantId = product.searchAttribute.validVariantIds[0];
    const variant = getVariantById(variantId);
    if (!variant) continue;
    productPreviewsCache.set(product.slug, {
      productSlug: product.slug,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      image: product.image,
      href: canonicalProductPath({ productSlug: product.slug, variantId, condition: "new", market: "us" }),
      variantLabel: variant.label,
      condition: "new",
      fromPrice: 0,
      offerCount: 0,
      live: false,
    });
  }
  return productPreviewsCache;
}

export function getProductListingPreview(productSlug: string): ProductListingPreview | null {
  return productPreviewIndex().get(productSlug) ?? null;
}

export function listProductListingPreviews() {
  return products
    .map((product) => productPreviewIndex().get(product.slug))
    .filter((preview): preview is ProductListingPreview => Boolean(preview));
}

export function snapshotSitemapEntry(criteria: SearchCriteria) {
  const snapshot = readBundledSnapshot(criteria);
  const live = Boolean(snapshot?.offers.some((offer) => offer.dataSource === "live"));
  const lastUpdated = snapshot?.lastUpdated && !Number.isNaN(Date.parse(snapshot.lastUpdated))
    ? new Date(snapshot.lastUpdated)
    : new Date();
  return { live, lastUpdated, priority: live ? 0.85 : 0.55 };
}

export function countLiveCatalogProducts() {
  return new Set(Object.keys(bundledSnapshots).map((key) => key.split(":")[0]).filter(Boolean)).size;
}

export type ComparisonDemoRow = {
  id: string;
  seller: string;
  listPrice: number;
  shipping: number | null;
  shippingKnown: boolean;
  knownTotal: number | null;
  role: "pick" | "cheapest" | "sample";
  note?: string;
};

export type ComparisonDemo = {
  brand: string;
  productName: string;
  variantLabel: string;
  href: string;
  offerCount: number;
  pickTotal: number | null;
  cheapestTotal: number | null;
  savingsGap: number | null;
  cheaperOfferCount: number;
  listingImageUrl?: string;
  rows: ComparisonDemoRow[];
};

function knownTotalForOffer(offer: Offer) {
  if (offer.shippingCostKnown === false) return null;
  return offer.price + offer.shippingCost;
}

function offerSellerLabel(offer: Offer) {
  return offer.seller.name?.trim() || offer.retailer.name;
}

function demoScoreForSnapshot(key: string, snapshot: OfferSearchResult) {
  const showcase = toShowcase(key, snapshot);
  if (!showcase) return null;
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  if (liveOffers.length < 8) return null;
  const recommendation = getRecommendation(liveOffers, "kelus_pick");
  const pick = liveOffers.find((offer) => offer.id === recommendation?.offerId) ?? liveOffers[0];
  const withTotals = liveOffers
    .map((offer) => ({ offer, total: knownTotalForOffer(offer) }))
    .filter((entry): entry is { offer: Offer; total: number } => entry.total !== null)
    .sort((left, right) => left.total - right.total);
  const cheapest = withTotals[0]?.offer;
  if (!cheapest || cheapest.id === pick.id) return null;
  const pickTotal = knownTotalForOffer(pick);
  const cheapestTotal = knownTotalForOffer(cheapest);
  if (pickTotal === null || cheapestTotal === null || pickTotal <= cheapestTotal) return null;
  const gap = pickTotal - cheapestTotal;
  let score = gap;
  if (offerSellerLabel(pick) !== offerSellerLabel(cheapest)) score += 20;
  if (liveOffers.length >= 15) score += 15;
  if (gap >= 15) score += 10;
  return score;
}

function buildComparisonDemo(key: string): ComparisonDemo | null {
  const snapshot = bundledSnapshots[key];
  const showcase = toShowcase(key, snapshot);
  if (!showcase) return null;
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  if (!liveOffers.length) return null;
  const recommendation = getRecommendation(liveOffers, "kelus_pick");
  const pick = liveOffers.find((offer) => offer.id === recommendation?.offerId) ?? liveOffers[0];
  const withTotals = liveOffers
    .map((offer) => ({ offer, total: knownTotalForOffer(offer) }))
    .filter((entry): entry is { offer: Offer; total: number } => entry.total !== null)
    .sort((left, right) => left.total - right.total);
  const cheapest = withTotals[0]?.offer;
  const pickTotal = knownTotalForOffer(pick);
  const cheapestTotal = cheapest ? knownTotalForOffer(cheapest) : null;
  const savingsGap = pickTotal !== null && cheapestTotal !== null && pickTotal > cheapestTotal
    ? pickTotal - cheapestTotal
    : null;
  const cheaperOfferCount = pickTotal === null
    ? 0
    : withTotals.filter((entry) => entry.offer.id !== pick.id && entry.total < pickTotal).length;
  const rows: ComparisonDemoRow[] = [];
  if (cheapest && cheapest.id !== pick.id) {
    rows.push({
      id: cheapest.id,
      seller: offerSellerLabel(cheapest),
      listPrice: cheapest.price,
      shipping: cheapest.shippingCostKnown === false ? null : cheapest.shippingCost,
      shippingKnown: cheapest.shippingCostKnown !== false,
      knownTotal: cheapestTotal,
      role: "cheapest",
      note: cheapest.trust?.suspiciousPrice ? "Flagged price anomaly" : "Lowest known total",
    });
  }
  rows.push({
    id: pick.id,
    seller: offerSellerLabel(pick),
    listPrice: pick.price,
    shipping: pick.shippingCostKnown === false ? null : pick.shippingCost,
    shippingKnown: pick.shippingCostKnown !== false,
    knownTotal: pickTotal,
    role: "pick",
  });
  return {
    brand: showcase.brand,
    productName: showcase.productName,
    variantLabel: showcase.variantLabel,
    href: showcase.href,
    offerCount: liveOffers.length,
    pickTotal,
    cheapestTotal,
    savingsGap,
    cheaperOfferCount,
    listingImageUrl: showcase.listingImageUrl,
    rows,
  };
}

export function getComparisonDemo(): ComparisonDemo | null {
  if (comparisonDemoCache !== undefined) return comparisonDemoCache;
  let bestKey: string | null = null;
  let bestScore = -1;
  for (const [key, snapshot] of Object.entries(bundledSnapshots)) {
    const score = demoScoreForSnapshot(key, snapshot);
    if (score !== null && score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }
  comparisonDemoCache = bestKey ? buildComparisonDemo(bestKey) : null;
  return comparisonDemoCache;
}

let comparisonDemoCache: ComparisonDemo | null | undefined;
