import { formatFromPrice, getProductListingPreview, readBundledSnapshot } from "./bundled-snapshot-catalog.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { SearchCriteria } from "../types/kelus.ts";

export type CatalogCardStatus = "validated" | "indexed";

export function getCriteriaListingPreview(criteria: SearchCriteria) {
  const snapshot = readBundledSnapshot(criteria);
  const liveOffers = snapshot?.offers.filter((offer) => offer.dataSource === "live") ?? [];
  const fromPrice = liveOffers.reduce<number | null>((best, offer) => {
    if (offer.shippingCostKnown === false) return best;
    const total = offer.price + offer.shippingCost;
    return best === null || total < best ? total : best;
  }, null);
  return {
    href: canonicalProductPath(criteria),
    fromPrice: fromPrice ?? 0,
    live: fromPrice !== null,
    offerCount: liveOffers.length,
  };
}

export function getProductCardStatus(productSlug: string) {
  const preview = getProductListingPreview(productSlug);
  if (!preview) return { status: "indexed" as const, href: `/product/${productSlug}`, label: "View comparison", detail: "Indexed — comparison not saved yet", listingImageUrl: undefined, imageLabel: "K" };
  if (preview.live && preview.fromPrice) {
    return { status: "validated" as const, href: preview.href, label: `From ${formatFromPrice(preview.fromPrice)}`, detail: "Validated comparison available", listingImageUrl: preview.listingImageUrl, imageLabel: preview.image };
  }
  return { status: "indexed" as const, href: preview.href, label: "View comparison", detail: "Indexed — comparison not saved yet", listingImageUrl: preview.listingImageUrl, imageLabel: preview.image };
}

export function rankAlternativeCriteria(criteria: SearchCriteria, alternatives: SearchCriteria[]) {
  return [...alternatives].sort((left, right) => {
    const leftLive = getCriteriaListingPreview(left).live ? 1 : 0;
    const rightLive = getCriteriaListingPreview(right).live ? 1 : 0;
    return rightLive - leftLive;
  });
}
