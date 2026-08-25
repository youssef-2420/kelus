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

export function resolveSearchAttributeVariantId(product: Product, variants: ProductVariant[], requestedVariantId?: string) {
  const configuredVariants = getSearchAttributeVariants(product, variants);
  if (requestedVariantId && configuredVariants.some((variant) => variant.id === requestedVariantId)) return requestedVariantId;
  return configuredVariants[0]?.id;
}

export function isValidSearchConfiguration(product: Product, variants: ProductVariant[], variantId?: string) {
  const configuredVariants = getSearchAttributeVariants(product, variants);
  if (product.searchAttribute.type === "none" && configuredVariants.length === 0) return !variantId;
  return Boolean(variantId && configuredVariants.some((variant) => variant.id === variantId));
}

export function getRelevantAttributeLabel(product: Product, variants: ProductVariant[]) {
  if (product.searchAttribute.type === "none" || getSearchAttributeVariants(product, variants).length <= 1) return null;
  return ATTRIBUTE_LABELS[product.searchAttribute.type];
}

export function getVisibleSearchAttributeLabel(product: Product, variants: ProductVariant[], productSelected: boolean) {
  return productSelected ? getRelevantAttributeLabel(product, variants) : null;
}
