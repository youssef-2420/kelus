import type { MetadataRoute } from "next";
import { products } from "../lib/demo-data.ts";
import { canonicalProductPath } from "../lib/search-state.ts";
import { CONDITIONS } from "../types/kelus.ts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kelus.me";
  const productUrls = products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) =>
    CONDITIONS.map((condition) => ({
      url: `${base}${canonicalProductPath({ productSlug: product.slug, variantId, condition, market: "us" })}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: condition === "new" ? 0.8 : 0.6,
    })),
  ));
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...productUrls,
  ];
}
