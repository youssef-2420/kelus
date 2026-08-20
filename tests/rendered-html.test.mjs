import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", process.pid + "-" + Date.now());
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Kelus comparison experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Kelus — Shop smarter\. Know before you buy\.<\/title>/i);
  assert.match(html, /Shop smarter\./);
  assert.match(html, /iPhone 17/);
  assert.match(html, /Compare prices/);
  assert.match(html, /Good time to buy/);
  assert.match(html, /Verified seller/);
  assert.match(html, /Price history/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
});

test("Kelus page and layout are product-specific", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /"use client"/);
  assert.match(page, /useState/);
  assert.match(page, /offerData/);
  assert.match(page, /filtersOpen/);
  assert.match(layout, /title: "Kelus — Shop smarter\. Know before you buy\."/);
  assert.match(layout, /description:/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
});
