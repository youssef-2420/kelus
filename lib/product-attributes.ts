import type { Product, ProductVariant } from "@/types/kelus";

export function getRelevantAttributeLabel(product: Product, variants: ProductVariant[]) {
  if (variants.length <= 1) return null;
  const category = product.category.toLowerCase();
  if (category.includes("phone")) return "Storage";
  if (/\b(tv|television)\b/.test(category)) return "Size";
  if (category.includes("console")) return "Edition";
  if (category.includes("laptop")) return "Configuration";
  return null;
}
