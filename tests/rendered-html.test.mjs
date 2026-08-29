import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const outputFor = (route) => route === "/" ? join(process.cwd(), ".next", "server", "app", "index.html") : join(process.cwd(), ".next", "server", "app", `${route.slice(1)}.html`);

test("builds static surfaces while canonical product intelligence remains server-rendered", async () => {
  for (const [route, expected] of [["/", "Shop smarter"], ["/how-it-works", "Shopping clarity"], ["/results", "Preparing your comparison"], ["/product/iphone-17", "Opening the current iPhone 17 comparison"], ["/compare/iphone-17", "See the trade-offs clearly"], ["/saved", "Keep an eye"]]) {
    const html = await readFile(outputFor(route), "utf8");
    assert.match(html, new RegExp(expected));
    assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  }
  await assert.rejects(access(join(process.cwd(), ".next", "server", "app", "checkout.html")));
});

test("canonical product runtime contains record-specific SEO and structured-data wiring", async () => {
  const [page, view] = await Promise.all([
    readFile(new URL("../app/product/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/results-v2/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /export const dynamic = "force-dynamic"/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /https:\/\/schema\.org/);
  assert.match(page, /alternates: \{ canonical: canonicalUrl \}/);
  assert.doesNotMatch(page, /six-month low|manufacturer warranty/i);
  for (const copy of [/Our Pick/, /Why this one/, /Our Pick vs Cheapest/, /View offer/, /When to Buy/, /Track/]) assert.match(view, copy);
  assert.match(page, /initialOutcome=\{initialOutcome\}/);
});

test("Product Intelligence presentation keeps production data wiring and the existing header", async () => {
  const [view, styles] = await Promise.all([
    readFile(new URL("../app/results-v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(view, /<Link href="\/" className="wordmark" aria-label="Kelus home">kelus<\/Link><SearchControls minimal minimalAction initialCriteria=\{criteria\} actionLabel="Search"\/>/);
  assert.match(view, /canonicalProductPath\(nextCriteria\)/);
  assert.match(view, /window\.location\.assign/);
  assert.match(view, /Updating recommendation…/);
  assert.match(view, /decision\.reasons\.join/);
  assert.match(view, /knownTotal/);
  assert.match(view, /OutboundRetailerCTA offer=\{pick\} label="View offer"/);
  assert.match(view, /if \(refreshPersistedResult\) return;/);
  assert.match(styles, /font-family:Inter[\s\S]*\/fonts\/inter-latin\.woff2/);
  assert.match(styles, /\.pi-selectors/);
  assert.match(styles, /\.pi-offer-reveal/);
  assert.match(styles, /\.search-field > \.suggestions \{ display:flex; flex-direction:column;/);
  assert.match(styles, /max-height:min\(420px,45dvh\)/);
  assert.match(styles, /\.hero-figma \{ min-height:760px; padding-top:72px; \}/);
  assert.match(styles, /\.hero-figma \.search-controls:has\(\.suggestions\)\{position:fixed;top:32px/);
  assert.match(styles, /@media \(max-width:430px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(view, /\$1,204|techprodeals|Apple warranty|12 offers/);
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
