import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { optimizedRetailerImageUrl } from "../services/retailer-image.ts";

test("eBay listing thumbnails request a bounded image instead of the original large asset", () => {
  assert.equal(
    optimizedRetailerImageUrl("https://i.ebayimg.com/images/g/example/s-l1600.jpg", 300),
    "https://i.ebayimg.com/images/g/example/s-l300.jpg",
  );
  assert.equal(
    optimizedRetailerImageUrl("https://i.ebayimg.com/images/g/example/s-l225.jpg", 160),
    "https://i.ebayimg.com/images/g/example/s-l160.jpg",
  );
  assert.equal(optimizedRetailerImageUrl("https://example.com/product.jpg", 300), "https://example.com/product.jpg");
});

test("homepage search uses a synchronous quiet transition without an interstitial", async () => {
  const source = await readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setTimeout\(resolve,\s*220\)/);
  assert.doesNotMatch(source, /setTimeout\(resolve,\s*200\)/);
  assert.doesNotMatch(source, /SearchProgress/);
  assert.match(source, /flushSync/);
  assert.match(source, /is-search-leaving/);
  assert.match(source, /Finding offers…/);
  assert.match(source, /window\.location\.assign/);
});

test("product suggestions use one native activation path", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const suggestionComponent = source.slice(source.indexOf("function ProductSuggestion"), source.indexOf("export function SearchControls"));
  assert.match(suggestionComponent, /onMouseDown=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(suggestionComponent, /onClick=\{\(\) => chooseProduct\(product\)\}/);
  assert.doesNotMatch(suggestionComponent, /onPointerDown/);
  assert.doesNotMatch(source, /aria-label="Product suggestions" onPointerDown/);
  assert.match(styles, /\.search-overlay-scrim\{[^}]*z-index:1/);
  assert.match(styles, /\.rp-search-pill-wrap\.is-overlay-open \.rp-search-suggestions\{z-index:4\}/);
  assert.doesNotMatch(styles, /\.search-overlay-scrim[^{}]*\{[^}]*z-index:28/);
});

test("Alerts reveals stored data before starting its background refresh", async () => {
  const source = await readFile(new URL("../app/alerts/page.tsx", import.meta.url), "utf8");
  const reveal = source.indexOf("setAlerts(stored); setExpanded(null);\n      setInitialLoading(false);");
  const refresh = source.indexOf("await refreshUserAlerts(user.id)");
  assert.ok(reveal >= 0);
  assert.ok(refresh > reveal);
});
