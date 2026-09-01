import type { ConditionFilter, Market, SearchCriteria } from "../types/kelus.ts";
import { getProductBySlug, getVariantById, getVariantsForProduct, products } from "./demo-data.ts";
import { getSearchAttributeVariants, isValidSearchConfiguration } from "./product-attributes.ts";

const validConditions: ConditionFilter[] = ["any", "new", "used", "refurbished"];
export const defaultSearch: SearchCriteria = { productSlug: "iphone-17", variantId: "iphone-17-256", condition: "new", market: "us" };

export function resolveConditionFromQuery(query: string, fallback: ConditionFilter = defaultSearch.condition): ConditionFilter {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(refurbished|renewed|certified refurbished)\b/.test(normalized)) return "refurbished";
  if (/\b(used|pre owned|preowned)\b/.test(normalized)) return "used";
  if (/\b(new|sealed|brand new|open box)\b/.test(normalized)) return "new";
  return fallback;
}

export function validateSearchCriteria(criteria: SearchCriteria): SearchCriteria | null {
  const product = getProductBySlug(criteria.productSlug);
  if (!product || !validConditions.includes(criteria.condition) || criteria.market !== "us") return null;
  if (!isValidSearchConfiguration(product, getVariantsForProduct(product.id), criteria.variantId)) return null;
  return criteria;
}

export function readSearchCriteria(params: URLSearchParams): SearchCriteria {
  const productSlug = getProductBySlug(params.get("product") ?? "")?.slug ?? defaultSearch.productSlug;
  const product = getProductBySlug(productSlug)!;
  const requestedVariant = getVariantById(params.get("variant") ?? undefined);
  const validVariants = getSearchAttributeVariants(product, getVariantsForProduct(product.id));
  const variantId = requestedVariant && validVariants.some((variant) => variant.id === requestedVariant.id) ? requestedVariant.id : validVariants[0]?.id;
  const condition = validConditions.includes(params.get("condition") as ConditionFilter) ? params.get("condition") as ConditionFilter : defaultSearch.condition;
  const market: Market = params.get("market") === "us" ? "us" : defaultSearch.market;
  return { productSlug, variantId, condition, market };
}
export function searchCriteriaToQuery(criteria: SearchCriteria) { const params = new URLSearchParams({ product: criteria.productSlug, condition: criteria.condition, market: criteria.market }); if (criteria.variantId) params.set("variant", criteria.variantId); return params.toString(); }

export function canonicalProductPath(criteria: SearchCriteria) {
  const valid = validateSearchCriteria(criteria);
  if (!valid?.variantId) throw new Error("A valid canonical product variant is required.");
  return `/product/${encodeURIComponent(`${valid.variantId}-${valid.condition}`)}`;
}

export function getAlternativeProductCriteria(criteria: SearchCriteria, limit = 3): SearchCriteria[] {
  const product = getProductBySlug(criteria.productSlug);
  if (!product || limit <= 0) return [];
  const variants = getSearchAttributeVariants(product, getVariantsForProduct(product.id));
  const conditions: ConditionFilter[] = ["new", "refurbished", "used", "any"];
  const alternatives: SearchCriteria[] = [];
  const seen = new Set([`${criteria.variantId ?? ""}:${criteria.condition}`]);
  const add = (variantId: string | undefined, condition: ConditionFilter) => {
    const key = `${variantId ?? ""}:${condition}`;
    if (seen.has(key)) return;
    const candidate = validateSearchCriteria({ ...criteria, variantId, condition });
    if (!candidate) return;
    seen.add(key);
    alternatives.push(candidate);
  };

  for (const condition of conditions) add(criteria.variantId, condition);
  for (const variant of variants) add(variant.id, criteria.condition);
  return alternatives.slice(0, limit);
}

export function readCanonicalProductCriteria(productSlug: string, variantId: string, condition: string): SearchCriteria | null {
  return validateSearchCriteria({
    productSlug: decodeURIComponent(productSlug),
    variantId: decodeURIComponent(variantId),
    condition: condition as ConditionFilter,
    market: "us",
  });
}

export function readCanonicalProductSlug(slug: string): SearchCriteria | null {
  const decoded = decodeURIComponent(slug);
  for (const product of products) {
    for (const variant of getSearchAttributeVariants(product, getVariantsForProduct(product.id))) {
      for (const condition of validConditions) {
        if (decoded === `${variant.id}-${condition}`) return validateSearchCriteria({ productSlug: product.slug, variantId: variant.id, condition, market: "us" });
      }
    }
  }
  return null;
}
