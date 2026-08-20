import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", process.pid + "-" + Date.now() + path);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost" + path, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Kelus core product flows", async () => {
  for (const [route, expected] of [["/", "Search once"], ["/results", "iPhone 17 offers"], ["/product/iphone-17", "Best balance of price"], ["/compare/iphone-17", "See the trade-offs clearly"]]) {
    const response = await render(route);
    const html = await response.text();
    assert.equal(response.status, 200, route + " returns 200");
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(html, new RegExp(expected));
    assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  }
});

test("Kelus source is product-specific and componentized", async () => {
  const [page, layout, data] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /SearchControls/);
  assert.match(page, /KelusHeader/);
  assert.match(data, /export const offers/);
  assert.match(layout, /title: "Kelus — Shop smarter\. Know before you buy\."/);
  assert.match(layout, /openGraph:/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
});
