import type { MetadataRoute } from "next";
import { createDemoSnapshot } from "@/data/demo-seed";

export const dynamic = "force-static";

const BASE_URL = "https://kelus.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/today/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/map/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/route/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/privacy/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms/`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/waitlist/`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const concepts: MetadataRoute.Sitemap = createDemoSnapshot(
    Date.parse("2026-09-03T12:00:00.000Z"),
  ).concepts.map((concept) => ({
    url: `${BASE_URL}/concepts/${concept.id}/`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticPages, ...concepts];
}
