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

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const containsValue = (query: string, value: string) => {
  const normalized = compact(value);
  return Boolean(normalized) && (` ${query} `.includes(` ${normalized} `) || query.replace(/\s/g, "").includes(normalized.replace(/\s/g, "")));
};

export function resolveSearchAttributeVariantIdFromQuery(product: Product, variants: ProductVariant[], query: string, requestedVariantId?: string) {
  const configuredVariants = getSearchAttributeVariants(product, variants);
  const normalized = compact(query);
  if (product.category === "Smartphone" && /\b(verizon|at t|att|t mobile|tmobile|sprint|cricket|boost mobile|straight talk|us cellular)\b/.test(normalized) && !/\bunlocked\b/.test(normalized)) return undefined;
  const keys = new Set(configuredVariants.flatMap((variant) => ["storage", ...Object.keys(variant.specifications)]));
  const selected = new Map<string, string>();
  for (const key of keys) {
    const values = [...new Set(configuredVariants.map((variant) => key === "storage" ? variant.storage ?? variant.specifications.storage : variant.specifications[key]).filter((value): value is string => Boolean(value) && value !== "Standard"))]
      .sort((left, right) => compact(right).length - compact(left).length);
    const found = values.find((value) => containsValue(normalized, value));
    if (found) selected.set(key, found);
  }
  if (!selected.size) return resolveSearchAttributeVariantId(product, variants, requestedVariantId);
  const compatible = configuredVariants.filter((variant) => [...selected].every(([key, value]) => {
    const actual = key === "storage" ? variant.storage ?? variant.specifications.storage : variant.specifications[key];
    return actual === value;
  }));
  if (!compatible.length) return undefined;
  if (requestedVariantId && compatible.some((variant) => variant.id === requestedVariantId)) return requestedVariantId;
  return compatible[0]?.id;
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
