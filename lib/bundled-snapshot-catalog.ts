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

function pickKnownTotal(snapshot: OfferSearchResult) {
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  const recommendation = getRecommendation(liveOffers, "kelus_pick");
  const pick = liveOffers.find((offer) => offer.id === recommendation?.offerId) ?? liveOffers[0];
  if (!pick) return null;
  return pick.shippingCostKnown === false ? pick.price : pick.price + pick.shippingCost;
}

function listingImageFromSnapshot(snapshot: OfferSearchResult) {
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  const recommendation = getRecommendation(liveOffers, "kelus_pick");
  const pick = liveOffers.find((offer) => offer.id === recommendation?.offerId)
    ?? liveOffers.find((offer) => offer.imageUrl)
    ?? liveOffers[0];
  return pick?.imageUrl;
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
  const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
  const fromPrice = lowestKnownTotal(liveOffers);
  if (fromPrice === null) return null;
  return {
    productSlug: parsed.productSlug,
    productName: product.name,
    brand: product.brand,
    variantLabel: variant.label,
    condition: parsed.condition,
    href: canonicalProductPath(parsed),
    fromPrice,
    pickPrice: pickKnownTotal(snapshot) ?? undefined,
    offerCount: liveOffers.length,
    lastUpdated: snapshot.lastUpdated,
    listingImageUrl: listingImageFromSnapshot(snapshot),
  };
}

export function listBundledShowcases(limit = 6): BundledShowcase[] {
  return Object.entries(bundledSnapshots)
    .flatMap(([key, snapshot]) => {
      const showcase = toShowcase(key, snapshot);
      return showcase ? [showcase] : [];
    })
    .sort((left, right) => left.fromPrice - right.fromPrice)
    .slice(0, Math.max(1, limit));
}

export function formatFromPrice(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function getProductListingPreview(productSlug: string): ProductListingPreview | null {
  const product = getProductBySlug(productSlug);
  if (!product) return null;
  const matches = Object.entries(bundledSnapshots).flatMap(([key, snapshot]) => {
    const showcase = toShowcase(key, snapshot);
    return showcase?.productSlug === productSlug ? [showcase] : [];
  });
  if (matches.length) {
    const best = matches.sort((left, right) => left.fromPrice - right.fromPrice)[0];
    return {
      productSlug,
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
    };
  }
  const variantId = product.searchAttribute.validVariantIds[0];
  const variant = getVariantById(variantId);
  if (!variant) return null;
  return {
    productSlug,
    productName: product.name,
    brand: product.brand,
    category: product.category,
    image: product.image,
    href: canonicalProductPath({ productSlug, variantId, condition: "new", market: "us" }),
    variantLabel: variant.label,
    condition: "new",
    fromPrice: 0,
    offerCount: 0,
    live: false,
  };
}

export function listProductListingPreviews() {
  return products
    .map((product) => getProductListingPreview(product.slug))
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
  rows: ComparisonDemoRow[];
};

function knownTotalForOffer(offer: Offer) {
  if (offer.shippingCostKnown === false) return null;
  return offer.price + offer.shippingCost;
}

function offerSellerLabel(offer: Offer) {
  return offer.seller.name?.trim() || offer.retailer.name;
}

export function getComparisonDemo(preferredHref = "/product/pixel-watch-3-41mm-used"): ComparisonDemo | null {
  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, snapshot] of Object.entries(bundledSnapshots)) {
    const showcase = toShowcase(key, snapshot);
    if (!showcase) continue;
    if (showcase.href === preferredHref || showcase.offerCount > bestCount) {
      if (showcase.href === preferredHref || showcase.offerCount > bestCount) {
        bestKey = key;
        bestCount = showcase.offerCount;
        if (showcase.href === preferredHref) break;
      }
    }
  }
  if (!bestKey) return null;
  const snapshot = bundledSnapshots[bestKey];
  const showcase = toShowcase(bestKey, snapshot);
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
  const sample = withTotals.find((entry) => entry.offer.id !== pick.id && entry.offer.id !== cheapest?.id)?.offer
    ?? withTotals[Math.min(2, withTotals.length - 1)]?.offer;
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
      note: cheapest.trust?.suspiciousPrice ? "Flagged price anomaly" : "Lowest list price",
    });
  }
  if (sample && sample.id !== pick.id && sample.id !== cheapest?.id) {
    rows.push({
      id: sample.id,
      seller: offerSellerLabel(sample),
      listPrice: sample.price,
      shipping: sample.shippingCostKnown === false ? null : sample.shippingCost,
      shippingKnown: sample.shippingCostKnown !== false,
      knownTotal: knownTotalForOffer(sample),
      role: "sample",
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
    note: recommendation?.reasons?.[0],
  });
  return {
    brand: showcase.brand,
    productName: showcase.productName,
    variantLabel: showcase.variantLabel,
    href: showcase.href,
    offerCount: liveOffers.length,
    pickTotal,
    cheapestTotal,
    rows,
  };
}
