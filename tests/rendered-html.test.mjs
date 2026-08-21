import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const outputFor = (route) => route === "/" ? join(process.cwd(), "out", "index.html") : join(process.cwd(), "out", route.slice(1), "index.html");

test("exports the Kelus comparison flow as static pages", async () => {
  for (const [route, expected] of [["/", "Shop smarter"], ["/how-it-works", "Shopping clarity"], ["/results", "Kelus Pick"], ["/product/iphone-17", "Best balance of price"], ["/compare/iphone-17", "See the trade-offs clearly"], ["/saved", "Keep an eye"]]) {
    const html = await readFile(outputFor(route), "utf8");
    assert.match(html, new RegExp(expected));
    assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  }
  await assert.rejects(access(join(process.cwd(), "out", "checkout", "index.html")));
});

test("Kelus source separates demo offers from recommendation and provider contracts", async () => {
  const [data, recommendation, provider, offerCard] = await Promise.all([
    readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/recommendations.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/providers/types.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/OfferCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(data, /demoRecommendations/);
  assert.match(recommendation, /tradeoffs/);
  assert.match(provider, /OfferProvider/);
  assert.match(offerCard, /OutboundRetailerCTA/);
  assert.doesNotMatch(offerCard, /Kelus score|score/);
});
