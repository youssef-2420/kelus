import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots.ts";
import sitemap from "../app/sitemap.ts";

test("sitemap contains discovery and canonical product URLs", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes("https://kelus.me/search"));
  assert.ok(urls.includes("https://kelus.me/products"));
  assert.ok(urls.includes("https://kelus.me/category/smartphones"));
  assert.ok(urls.includes("https://kelus.me/product/iphone-17-pro-256gb-new"));
  assert.ok(urls.includes("https://kelus.me/product/macbook-pro-16-m4-max-36-1tb-used"));
  assert.ok(urls.includes("https://kelus.me/product/playstation-5-slim-disc-new"));
  assert.doesNotMatch(urls.join("\n"), /-any$/);
  assert.equal(new Set(urls).size, urls.length);
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
