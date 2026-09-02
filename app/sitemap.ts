import type { MetadataRoute } from "next";
import { snapshotSitemapEntry } from "../lib/bundled-snapshot-catalog.ts";
import { allCategoryHubPaths } from "../lib/category-routes.ts";
import { products } from "../lib/demo-data.ts";
import { canonicalProductPath } from "../lib/search-state.ts";
import { absoluteCanonicalUrl } from "../lib/seo-url.ts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const productUrls = products.flatMap((product) => product.searchAttribute.validVariantIds.flatMap((variantId) => (["new", "used"] as const).flatMap((condition) => {
    const criteria = { productSlug: product.slug, variantId, condition, market: "us" as const };
    const snapshotMeta = snapshotSitemapEntry(criteria);
    return [{
      url: absoluteCanonicalUrl(canonicalProductPath(criteria)),
      lastModified: snapshotMeta.lastUpdated,
      changeFrequency: snapshotMeta.live ? "daily" as const : "weekly" as const,
      priority: snapshotMeta.priority,
    }];
  })));
  const categoryUrls = allCategoryHubPaths().map((path) => ({
    url: absoluteCanonicalUrl(path),
    changeFrequency: "weekly" as const,
    priority: 0.78,
  }));
  return [
    { url: absoluteCanonicalUrl(), changeFrequency: "weekly", priority: 1 },
    { url: absoluteCanonicalUrl("/search"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteCanonicalUrl("/products"), changeFrequency: "weekly", priority: 0.88 },
    { url: absoluteCanonicalUrl("/coverage"), changeFrequency: "weekly", priority: 0.82 },
    { url: absoluteCanonicalUrl("/how-it-works"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteCanonicalUrl("/methodology"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteCanonicalUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteCanonicalUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
    ...categoryUrls,
    ...productUrls,
  ];
}
