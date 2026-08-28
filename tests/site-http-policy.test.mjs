import assert from "node:assert/strict";
import test from "node:test";
import { applyRootResponsePolicy, canonicalHostRedirect } from "../services/product-response-policy.ts";

test("www redirects once to the canonical apex while preserving path and query", () => {
  const response = canonicalHostRedirect("https://www.kelus.me/product/iphone-17-pro-256gb-new/?source=crawler");
  assert.equal(response?.status, 308);
  assert.equal(response?.headers.get("location"), "https://kelus.me/product/iphone-17-pro-256gb-new/?source=crawler");
  assert.equal(canonicalHostRedirect("https://kelus.me/"), null);
});

test("the successful root document has a bounded stale-if-error CDN fallback", async () => {
  const response = applyRootResponsePolicy("/", new Response("<html>Kelus</html>", {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>Kelus</html>");
  assert.match(response.headers.get("cache-control") ?? "", /must-revalidate/);
  assert.match(response.headers.get("cloudflare-cdn-cache-control") ?? "", /stale-if-error=86400/);
});

test("root fallback policy never caches errors or non-root routes", () => {
  const error = new Response("error", { status: 503, headers: { "Content-Type": "text/html" } });
  assert.equal(applyRootResponsePolicy("/", error), error);
  const product = new Response("product", { status: 200, headers: { "Content-Type": "text/html" } });
  assert.equal(applyRootResponsePolicy("/product/example", product), product);
});
