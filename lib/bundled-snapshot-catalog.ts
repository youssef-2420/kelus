import snapshots from "../data/bundled-product-intelligence-snapshots.json" with { type: "json" };
import { getProductBySlug, getVariantById, products } from "./demo-data.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { ConditionFilter, Offer, OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { catalogSnapshotTargetKey } from "./catalog-snapshot-targets.ts";
import { getRecommendation } from "../services/recommendations.ts";

const bundledSnapshots = snapshots as Record<string, OfferSearchResult>;
const siteOrigin = "https://kelus.me";

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
};

export type ProductListingPreview = {
  productSlug: string;
  productName: string;
  brand: string;
  category: string;
  href: string;
  variantLabel: string;
  condition: ConditionFilter;
  fromPrice: number;
  pickPrice?: number;
  offerCount: number;
  live: boolean;
  lastUpdated?: string;
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
  const pickPrice = pickKnownTotal(snapshot) ?? undefined;
  return {
    productSlug: parsed.productSlug,
    productName: product.name,
    brand: product.brand,
    variantLabel: variant.label,
    condition: parsed.condition,
    href: canonicalProductPath(parsed),
    fromPrice,
    pickPrice,
    offerCount: liveOffers.length,
    lastUpdated: snapshot.lastUpdated,
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
      href: best.href,
      variantLabel: best.variantLabel,
      condition: best.condition,
      fromPrice: best.fromPrice,
      pickPrice: best.pickPrice,
      offerCount: best.offerCount,
      live: true,
      lastUpdated: best.lastUpdated,
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

export function getCriteriaListingPreview(criteria: SearchCriteria): ProductListingPreview | null {
  const product = getProductBySlug(criteria.productSlug);
  const variant = getVariantById(criteria.variantId);
  if (!product || !variant) return null;
  const snapshot = readBundledSnapshot(criteria);
  const liveOffers = snapshot?.offers.filter((offer) => offer.dataSource === "live") ?? [];
  const fromPrice = lowestKnownTotal(liveOffers);
  if (fromPrice === null) return null;
  return {
    productSlug: product.slug,
    productName: product.name,
    brand: product.brand,
    category: product.category,
    href: canonicalProductPath(criteria),
    variantLabel: variant.label,
    condition: criteria.condition === "any" ? "new" : criteria.condition,
    fromPrice,
    pickPrice: snapshot ? pickKnownTotal(snapshot) ?? undefined : undefined,
    offerCount: liveOffers.length,
    live: true,
    lastUpdated: snapshot?.lastUpdated,
  };
}

export function snapshotSitemapEntry(criteria: SearchCriteria) {
  const snapshot = readBundledSnapshot(criteria);
  const live = Boolean(snapshot?.offers.some((offer) => offer.dataSource === "live"));
  const lastUpdated = snapshot?.lastUpdated && !Number.isNaN(Date.parse(snapshot.lastUpdated))
    ? new Date(snapshot.lastUpdated)
    : new Date();
  return { live, lastUpdated, priority: live ? 0.85 : 0.55 };
}

export function formatFromPrice(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function absoluteOgImage(path = "/og.png") {
  return `${siteOrigin}${path}`;
}
