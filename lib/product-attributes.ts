import type { Product, ProductVariant } from "@/types/kelus";

export function getRelevantAttributeLabel(product: Product, variants: ProductVariant[]) {
  if (variants.length <= 1) return null;
  const family = product.identifiers.family?.toLowerCase() ?? "";
  const category = product.category.toLowerCase();
  if (family === "iphone") return "Storage";
  if (category === "tv" || category.includes("television")) return "Size";
  if (category.includes("console")) return "Edition";
  if (category.includes("laptop")) return "Configuration";
  return "Configuration";
}
