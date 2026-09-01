import { getDiscoverableProducts, getProductBySlug } from "./demo-data.ts";
import { listBundledShowcases } from "./bundled-snapshot-catalog.ts";
import { canonicalProductPath } from "./search-state.ts";
import type { Product } from "../types/kelus.ts";

export type SearchQuickStart = {
  product: Product;
  href: string;
  fromPrice?: number;
  offerCount?: number;
  live: boolean;
};

export function getSearchQuickStarts(limit = 8): SearchQuickStart[] {
  const live = listBundledShowcases(limit).flatMap((showcase) => {
    const product = getProductBySlug(showcase.productSlug);
    if (!product) return [];
    return [{
      product,
      href: showcase.href,
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
