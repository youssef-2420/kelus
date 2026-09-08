import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://kelus.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/route/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/waitlist/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/questions/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/pricing/`, changeFrequency: "monthly", priority: 0.6 },
  ];
  return staticPages;
}
