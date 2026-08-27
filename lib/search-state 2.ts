import type { ConditionFilter, Market, SearchCriteria } from "@/types/kelus";
import { getProductBySlug, getVariantById } from "@/lib/demo-data";

const validConditions: ConditionFilter[] = ["any", "new", "used", "refurbished"];
export const defaultSearch: SearchCriteria = { productSlug: "iphone-17", variantId: "iphone-17-256", condition: "any", market: "us" };

export function readSearchCriteria(params: URLSearchParams): SearchCriteria {
  const productSlug = getProductBySlug(params.get("product") ?? "")?.slug ?? defaultSearch.productSlug;
  const requestedVariant = getVariantById(params.get("variant") ?? undefined);
  const variantId = requestedVariant && requestedVariant.productId === getProductBySlug(productSlug)?.id ? requestedVariant.id : undefined;
  const condition = validConditions.includes(params.get("condition") as ConditionFilter) ? params.get("condition") as ConditionFilter : defaultSearch.condition;
  const market: Market = params.get("market") === "us" ? "us" : defaultSearch.market;
  return { productSlug, variantId, condition, market };
}
export function searchCriteriaToQuery(criteria: SearchCriteria) { const params = new URLSearchParams({ product: criteria.productSlug, condition: criteria.condition, market: criteria.market }); if (criteria.variantId) params.set("variant", criteria.variantId); return params.toString(); }
