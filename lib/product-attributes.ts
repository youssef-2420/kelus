import type { Product, ProductVariant } from "@/types/kelus";

const ATTRIBUTE_LABELS = {
  storage: "Storage",
  size: "Size",
  edition: "Edition",
  configuration: "Configuration",
} as const;

export function getSearchAttributeVariants(product: Product, variants: ProductVariant[]) {
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  return product.searchAttribute.validVariantIds
    .map((variantId) => variantsById.get(variantId))
    .filter((variant): variant is ProductVariant => variant !== undefined)
    .filter((variant) => variant.productId === product.id);
}

export function getRelevantAttributeLabel(product: Product, variants: ProductVariant[]) {
  if (product.searchAttribute.type === "none" || getSearchAttributeVariants(product, variants).length <= 1) return null;
  return ATTRIBUTE_LABELS[product.searchAttribute.type];
}
