import { getDiscoverableProducts, getProductBySlug } from "./demo-data.ts";
import { listBundledShowcases } from "./bundled-snapshot-catalog.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { ConditionFilter, Product } from "../types/kelus.ts";

export type SearchQuickStart = {
  product: Product;
  href: string;
  variantLabel?: string;
  condition?: ConditionFilter;
  fromPrice?: number;
  offerCount?: number;
  live: boolean;
};

export function formatQuickStartLabel(item: SearchQuickStart) {
  const { product } = item;
  const base = product.name.startsWith(product.brand) ? product.name : `${product.brand} ${product.name}`;
  const parts = [base];
  if (item.variantLabel && item.variantLabel !== product.name) parts.push(item.variantLabel);
  if (item.condition === "used") parts.push("Used");
  else if (item.condition === "new") parts.push("New");
  return parts.join(" · ");
}

export function getSearchQuickStarts(limit = 8): SearchQuickStart[] {
  const showcases = listBundledShowcases(48);
  const bestBySlug = new Map<string, (typeof showcases)[number]>();
  for (const showcase of showcases) {
    const existing = bestBySlug.get(showcase.productSlug);
    if (!existing || showcase.offerCount > existing.offerCount) {
      bestBySlug.set(showcase.productSlug, showcase);
    }
  }

  const live = Array.from(bestBySlug.values())
    .sort((left, right) => right.offerCount - left.offerCount)
    .flatMap((showcase) => {
      const product = getProductBySlug(showcase.productSlug);
      if (!product) return [];
      return [{
        product,
        href: showcase.href,
        variantLabel: showcase.variantLabel,
        condition: showcase.condition,
        fromPrice: showcase.fromPrice,
        offerCount: showcase.offerCount,
        live: true,
      }];
    });

  const seen = new Set(live.map((item) => item.product.slug));
  const fallback = getDiscoverableProducts(limit).flatMap((product) => {
    if (seen.has(product.slug)) return [];
    seen.add(product.slug);
    return [{
      product,
      href: canonicalProductPath({
        productSlug: product.slug,
        variantId: product.searchAttribute.validVariantIds[0],
        condition: "new",
        market: "us",
      }),
      live: false,
    }];
  });

  return [...live, ...fallback].slice(0, limit);
}
