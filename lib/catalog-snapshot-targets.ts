import type { SearchCriteria } from "../types/kelus.ts";
import { getDiscoverableProducts, products } from "./demo-data.ts";

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

const catalogRotationIntervalMs = 15 * 60 * 1_000;

export function priorityCatalogSnapshotTargets(): SearchCriteria[] {
  return getDiscoverableProducts(12).flatMap((product) => {
    const variantId = product.searchAttribute.validVariantIds[0];
    return variantId ? [{ productSlug: product.slug, variantId, condition: "new" as const, market: "us" as const }] : [];
  });
}

export function rotateCatalogSnapshotTargets(now: number, limit: number): SearchCriteria[] {
  const catalog = allCatalogSnapshotTargets();
  if (!catalog.length) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), catalog.length));
  const rotation = Math.floor(now / catalogRotationIntervalMs);
  const priority = priorityCatalogSnapshotTargets();
  const selected = new Map<string, SearchCriteria>();
  if (priority.length) {
    const target = priority[rotation % priority.length];
    selected.set(catalogSnapshotTargetKey(target), target);
  }
  const generalSlots = Math.max(1, safeLimit - selected.size);
  const start = (rotation * generalSlots) % catalog.length;
  for (let offset = 0; selected.size < safeLimit && offset < catalog.length; offset += 1) {
    const target = catalog[(start + offset) % catalog.length];
    selected.set(catalogSnapshotTargetKey(target), target);
  }
  return [...selected.values()];
}
