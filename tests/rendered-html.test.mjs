import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const outputFor = (route) => route === "/" ? join(process.cwd(), "out", "index.html") : join(process.cwd(), "out", route.slice(1), "index.html");

test("exports the Kelus comparison flow as static pages", async () => {
  for (const [route, expected] of [["/", "Shop smarter"], ["/how-it-works", "Shopping clarity"], ["/results", "Preparing your comparison"], ["/product/iphone-17", "Opening the current iPhone 17 comparison"], ["/product/iphone-17-256-new", "iPhone 17"], ["/compare/iphone-17", "See the trade-offs clearly"], ["/saved", "Keep an eye"]]) {
    const html = await readFile(outputFor(route), "utf8");
    assert.match(html, new RegExp(expected));
    assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  }
  await assert.rejects(access(join(process.cwd(), "out", "checkout", "index.html")));
});

test("canonical product exports contain record-specific SEO and structured data", async () => {
  const html = await readFile(outputFor("/product/iphone-17-pro-256gb-new"), "utf8");
  assert.match(html, /iPhone 17 Pro 256GB prices \| Kelus/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /https:\/\/schema\.org/);
  assert.match(html, /rel="canonical" href="https:\/\/kelus\.me\/product\/iphone-17-pro-256gb-new"/);
  assert.doesNotMatch(html, /six-month low|manufacturer warranty/i);
  assert.match(html, /OUR PICK/);
  assert.match(html, /Price context/);
  assert.match(html, /Track/);
  assert.match(html, /live offers checked/);
  assert.doesNotMatch(html, /Checking connected offers|Comparing live eBay offers/);
});

test("Kelus source separates demo offers from recommendation and provider contracts", async () => {
  const [data, recommendation, provider, offerCard] = await Promise.all([
    readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/recommendations.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/providers/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/OfferCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(data, /Seed data is deliberately demo-only/);
  assert.match(recommendation, /tradeoffs/);
  assert.match(provider, /SearchCriteria/);
  assert.match(offerCard, /OutboundRetailerCTA/);
  assert.doesNotMatch(offerCard, /Kelus score|score/);
});

test("production navigation avoids the incompatible client-side link shim", async () => {
  const [header, results, search] = await Promise.all([
    readFile(new URL("../components/KelusHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/results/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(header + results, /from ["']next\/link["']/);
  assert.match(header, /SafeLink/);
  assert.match(results + search, /window\.location\.assign/);
  assert.match(search, /canonicalProductPath\(criteria\)/);
  assert.doesNotMatch(search, /startSearch/);
});
