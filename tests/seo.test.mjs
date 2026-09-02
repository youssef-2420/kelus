import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";
import { readBundledSnapshot } from "../lib/bundled-snapshot-catalog.ts";
import { shouldRedirectToValidatedAlternative } from "../lib/preferred-product-criteria.ts";
import { readCanonicalProductSlug } from "../lib/search-state.ts";

test("sitemap contains discovery and canonical product URLs", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.ok(urls.includes("https://kelus.me/search/"));
  assert.ok(urls.includes("https://kelus.me/products/"));
  assert.ok(urls.includes("https://kelus.me/coverage/"));
  assert.ok(urls.includes("https://kelus.me/category/smartphones/"));
  assert.ok(urls.includes("https://kelus.me/product/iphone-17-pro-256gb-new/"));
  assert.ok(urls.includes("https://kelus.me/product/playstation-5-slim-disc-new/"));
  assert.doesNotMatch(urls.join("\n"), /-any$/);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => url.endsWith("/")));
  assert.equal(entries.find((entry) => entry.url === "https://kelus.me/")?.lastModified, undefined);
  assert.ok(entries.find((entry) => entry.url === "https://kelus.me/product/iphone-17-pro-256gb-new/")?.lastModified);

  for (const url of urls.filter((url) => url.includes("/product/"))) {
    const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    const criteria = slug ? readCanonicalProductSlug(slug) : null;
    assert.ok(criteria, `expected canonical product criteria for ${url}`);
    const hasLiveOffers = readBundledSnapshot(criteria)?.offers.some((offer) => offer.dataSource === "live") ?? false;
    assert.equal(shouldRedirectToValidatedAlternative(criteria, hasLiveOffers), null, `${url} must not redirect to another product configuration`);
  }
});

test("robots exposes the canonical sitemap and blocks private routes", () => {
  assert.deepEqual(robots(), {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/internal/", "/auth/"],
    },
    sitemap: "https://kelus.me/sitemap.xml",
  });
});
