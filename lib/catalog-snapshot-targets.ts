import type { SearchCriteria } from "../types/kelus.ts";
import { products } from "./demo-data.ts";

export const seoIndexedConditions = ["new", "used"] as const;
export type SeoIndexedCondition = (typeof seoIndexedConditions)[number];

export function allCatalogSnapshotTargets(): SearchCriteria[] {
  return products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) =>
    seoIndexedConditions.map((condition): SearchCriteria => ({
      productSlug: product.slug,
      variantId,
      condition,
      market: "us",
    })),
  ));
}

export function catalogSnapshotTargetKey(criteria: SearchCriteria) {
  return [criteria.productSlug, criteria.variantId ?? "", criteria.condition, criteria.market].join(":");
}

const catalogRotationIntervalMs = 6 * 60 * 60 * 1_000;

export function rotateCatalogSnapshotTargets(now: number, limit: number): SearchCriteria[] {
  const catalog = allCatalogSnapshotTargets();
  if (!catalog.length) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), catalog.length));
  const rotation = Math.floor(now / catalogRotationIntervalMs);
  const start = (rotation * safeLimit) % catalog.length;
  return Array.from({ length: safeLimit }, (_, index) => catalog[(start + index) % catalog.length]);
}
