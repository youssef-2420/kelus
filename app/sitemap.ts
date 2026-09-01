import type { MetadataRoute } from "next";
import { snapshotSitemapEntry } from "../lib/bundled-snapshot-catalog.ts";
import { allCategoryHubPaths } from "../lib/category-routes.ts";
import { products } from "../lib/demo-data.ts";
import { canonicalProductPath } from "../lib/search-state.ts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://kelus.me";
  const productUrls = products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) => (["new", "used"] as const).flatMap((condition) => {
    const criteria = { productSlug: product.slug, variantId, condition, market: "us" as const };
    const snapshotMeta = snapshotSitemapEntry(criteria);
    return [{
      url: `${base}${canonicalProductPath(criteria)}`,
      lastModified: snapshotMeta.lastUpdated,
      changeFrequency: snapshotMeta.live ? "daily" as const : "weekly" as const,
      priority: snapshotMeta.priority,
    }];
  })));
  const categoryUrls = allCategoryHubPaths().map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.78,
  }));
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/products`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.88 },
    { url: `${base}/coverage`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.82 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...categoryUrls,
    ...productUrls,
  ];
}
