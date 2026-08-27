import assert from "node:assert/strict";
import test from "node:test";
import { applyCanonicalProductResponsePolicy } from "../services/product-response-policy.ts";

test("canonical product HTML cannot reuse a stale loading-shell response", async () => {
  const response = applyCanonicalProductResponsePolicy("/product/iphone-17-pro-256gb-new/", new Response("resolved"));
  assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
  assert.equal(response.headers.get("CDN-Cache-Control"), "no-store");
  assert.equal(response.headers.get("Cloudflare-CDN-Cache-Control"), "no-store");
  assert.equal(await response.text(), "resolved");
});

test("non-product responses preserve their existing cache policy", () => {
  const original = new Response("home", { headers: { "Cache-Control": "public, max-age=60" } });
  assert.equal(applyCanonicalProductResponsePolicy("/", original), original);
});
