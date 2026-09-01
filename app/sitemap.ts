import type { MetadataRoute } from "next";
import { allCategoryHubPaths } from "../lib/category-routes.ts";
import { products } from "../lib/demo-data.ts";
import { canonicalProductPath } from "../lib/search-state.ts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kelus.me";
  const productUrls = products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) => ([
    {
      url: `${base}${canonicalProductPath({ productSlug: product.slug, variantId, condition: "new", market: "us" })}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${base}${canonicalProductPath({ productSlug: product.slug, variantId, condition: "used", market: "us" })}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.65,
    },
  ])));
  const categoryUrls = allCategoryHubPaths().map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/coverage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...categoryUrls,
    ...productUrls,
  ];
}
