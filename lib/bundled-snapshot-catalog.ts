import snapshots from "../data/bundled-product-intelligence-snapshots.json" with { type: "json" };
import { getProductBySlug, getVariantById } from "./demo-data.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { ConditionFilter, Offer, OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { catalogSnapshotTargetKey } from "./catalog-snapshot-targets.ts";

const bundledSnapshots = snapshots as Record<string, OfferSearchResult>;

function lowestKnownTotal(offers: Offer[]) {
  return offers.reduce<number | null>((best, offer) => {
    if (offer.dataSource !== "live") return best;
    const total = offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
    if (total === null) return best;
    return best === null || total < best ? total : best;
  }, null);
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
  offerCount: number;
  lastUpdated?: string;
};

export function listBundledShowcases(limit = 6): BundledShowcase[] {
  return Object.entries(bundledSnapshots).flatMap(([key, snapshot]) => {
    const [productSlug, variantId, condition, market] = key.split(":");
    if (!productSlug || !variantId || !condition || market !== "us") return [];
    const product = getProductBySlug(productSlug);
    const variant = getVariantById(variantId);
    if (!product || !variant) return [];
    const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
    const fromPrice = lowestKnownTotal(liveOffers);
    if (fromPrice === null) return [];
    return [{
      productSlug,
      productName: product.name,
      brand: product.brand,
      variantLabel: variant.label,
      condition: condition as ConditionFilter,
      href: canonicalProductPath({ productSlug, variantId, condition: condition as ConditionFilter, market: "us" }),
      fromPrice,
      offerCount: liveOffers.length,
      lastUpdated: snapshot.lastUpdated,
    }];
  }).sort((left, right) => left.fromPrice - right.fromPrice).slice(0, Math.max(1, limit));
}

export function formatFromPrice(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function getProductListingPreview(productSlug: string) {
  const product = getProductBySlug(productSlug);
  if (!product) return null;
  const matches = Object.entries(bundledSnapshots).flatMap(([key, snapshot]) => {
    const [slug, variantId, condition, market] = key.split(":");
    if (slug !== productSlug || market !== "us" || !variantId || !condition) return [];
    const variant = getVariantById(variantId);
    if (!variant) return [];
    const liveOffers = snapshot.offers.filter((offer) => offer.dataSource === "live");
    const fromPrice = lowestKnownTotal(liveOffers);
    if (fromPrice === null) return [];
    return [{
      href: canonicalProductPath({ productSlug, variantId, condition: condition as ConditionFilter, market: "us" }),
      fromPrice,
      live: true,
    }];
  });
  if (matches.length) {
    const best = matches.sort((left, right) => left.fromPrice - right.fromPrice)[0];
    return { ...best, productName: product.name, brand: product.brand };
  }
  const variantId = product.searchAttribute.validVariantIds[0];
  const variant = getVariantById(variantId);
  if (!variant) return null;
  return {
    href: canonicalProductPath({ productSlug, variantId, condition: "new", market: "us" }),
    fromPrice: 0,
    live: false,
    productName: product.name,
    brand: product.brand,
  };
}

export function countLiveCatalogProducts() {
  return new Set(Object.keys(bundledSnapshots).map((key) => key.split(":")[0]).filter(Boolean)).size;
}
