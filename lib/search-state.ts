import type { ConditionFilter, Market, SearchCriteria } from "../types/kelus.ts";
import { getProductBySlug, getVariantById, getVariantsForProduct } from "./demo-data.ts";
import { getSearchAttributeVariants, isValidSearchConfiguration } from "./product-attributes.ts";

const validConditions: ConditionFilter[] = ["any", "new", "used", "refurbished"];
export const defaultSearch: SearchCriteria = { productSlug: "iphone-17", variantId: "iphone-17-256", condition: "any", market: "us" };

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
