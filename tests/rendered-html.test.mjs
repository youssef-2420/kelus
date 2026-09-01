import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const outputFor = (route) => route === "/" ? join(process.cwd(), ".next", "server", "app", "index.html") : join(process.cwd(), ".next", "server", "app", `${route.slice(1)}.html`);

test("builds static surfaces while canonical product intelligence remains server-rendered", async () => {
  for (const [route, expected] of [["/", "Shop smarter"], ["/how-it-works", "Shopping clarity"], ["/methodology", "See what Kelus checks"], ["/results", "Preparing your comparison"], ["/product/iphone-17", "Opening the current iPhone 17 comparison"]]) {
    const html = await readFile(outputFor(route), "utf8");
    assert.match(html, new RegExp(expected));
    assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/i);
  }
  await assert.rejects(access(join(process.cwd(), ".next", "server", "app", "checkout.html")));
});

test("loads the configured Google Analytics property without automatic duplicate page views", async () => {
  const html = await readFile(outputFor("/"), "utf8");
  assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-B4WD58PYF6/);
  assert.match(html, /send_page_view/);
  assert.match(html, /false/);
});

test("legacy compare demo redirects to the canonical product page", async () => {
  const compare = await readFile(new URL("../app/compare/iphone-17/page.tsx", import.meta.url), "utf8");
  assert.match(compare, /redirect\(canonicalProductPath\(defaultSearch\)\)/);
});

test("OAuth callback queues the global sign-in notice", async () => {
  const callback = await readFile(new URL("../app/auth/callback/page.tsx", import.meta.url), "utf8");
  const auth = await readFile(new URL("../components/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(callback, /kelus-sign-in-notice/);
  assert.match(callback, /router\.replace\(next\)/);
  assert.match(auth, /kelus-sign-in-notice/);
});

test("legacy saved route consistently redirects to My Alerts", async () => {
  const saved = await readFile(new URL("../app/saved/page.tsx", import.meta.url), "utf8");
  assert.match(saved, /redirect\("\/alerts"\)/);
  assert.doesNotMatch(saved, /Illustrative best offer|kelus-watched-products/);
});

test("homepage keeps its explanation compact while How It Works preserves the full content", async () => {
  const [home, how] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/how-it-works/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /className="how-brief section"/);
  assert.match(home, /SearchLauncher/);
  assert.doesNotMatch(home, /SearchControls/);
  assert.doesNotMatch(home, /catalog-links/);
  assert.doesNotMatch(home, /Open full search/);
  assert.doesNotMatch(home, /className="feature-grid"/);
  assert.match(how, /Every price tells only part of the story/);
  assert.match(how, /Price, seller quality, shipping, and available retailer terms/);
  assert.doesNotMatch(how, /manufacturer warranty/);
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
  assert.doesNotMatch(page, /ProductSeoIntro/);
  assert.doesNotMatch(page, /six-month low|manufacturer warranty/i);
  for (const copy of [/Our Pick/, /Kelus verdict/, /Why this offer/, /Our Pick vs Cheapest/, /View offer/, /When to Buy/, /Track/]) assert.match(view, copy);
  assert.match(page, /initialOutcome=\{initialOutcome\}/);
  assert.match(view, /<h1 className="pi-title">/);
  assert.match(view, /productPageHeading/);
});

test("Product Intelligence presentation keeps production data wiring and the existing header", async () => {
  const [view, header, notifyWhenLive, styles] = await Promise.all([
    readFile(new URL("../app/results-v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ProductHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/NotifyWhenLive.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(view, /ProductHeader criteria=\{criteria\}/);
  assert.match(header, /SearchControls minimal minimalAction initialCriteria=\{criteria\} actionLabel="Search"/);
  assert.match(view, /canonicalProductPath\(nextCriteria\)/);
  assert.match(view, /router\.push\(canonicalProductPath/);
  assert.match(view, /Updating recommendation…/);
  assert.match(view, /decision\.reasons\.join/);
  assert.match(view, /knownTotal/);
  assert.match(view, /Known total/);
  assert.match(view, /No cheaper comparable offer passed Kelus validation/);
  assert.match(view, /Comparison not ready yet/);
  assert.match(view, /no listing passed the current product, variant, condition, and trust checks/);
  assert.match(view, /Try another supported configuration/);
  assert.match(view, /Why Kelus may reject an offer/);
  assert.match(view, /ConfidenceBadge/);
  assert.match(view, /Collecting price data/);
  assert.match(view, /pi-fallback-nearest/);
  assert.match(view, /VALIDATED COMPARISON/);
  assert.match(view, /LIVE EBAY OFFERS/);
  assert.match(view, /PriceHistorySparkline/);
  assert.match(view, /NotifyWhenLive/);
  assert.match(notifyWhenLive, /allowUnavailable/);
  assert.match(view, /<details className="pi-proof" open>/);
  assert.match(view, /How Kelus chose this/);
  assert.match(view, /See how Kelus picks an offer/);
  assert.match(view, /Why this offer won/);
  assert.match(view, /Skip the cheapest offer\./);
  assert.match(view, /lowest\.trust\?\.suspiciousPrice/);
  assert.match(view, /No suspicious-price flag/);
  assert.match(view, /pi-retailer-logo/);
  assert.match(view, /getProductIntelligenceOptions/);
  assert.match(view, /OutboundRetailerCTA offer=\{pick\} label="View offer"/);
  assert.match(view, /if \(refreshPersistedResult\) return;/);
  assert.match(view, /setRefreshingSnapshot\(true\)/);
  assert.match(view, /pi-refresh-banner/);
  assert.match(view, /Kelus is checking live eBay offers in the background/);
  assert.match(view, /Checking for newer offers/);
  assert.match(styles, /\.pi-refreshing-status/);
  assert.match(styles, /\.pi-refresh-banner/);
  assert.match(styles, /font-family:Inter[\s\S]*\/fonts\/inter-latin\.woff2/);
  assert.match(styles, /\.pi-selectors/);
  assert.match(styles, /\.pi-offer-reveal/);
  assert.match(styles, /\.search-field > \.suggestions \{ display:flex; flex-direction:column;/);
  assert.match(styles, /max-height:min\(480px,56dvh\)/);
  assert.match(styles, /\.hero-figma \{ min-height:730px; padding-top:16px; \}/);
  assert.match(styles, /\.hero-content \{ position:relative; z-index:1; margin-top:44px; \}/);
  assert.doesNotMatch(styles, /\.search-controls:has\(\.suggestions\)\{position:fixed/);
  assert.match(styles, /@media \(max-width:430px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(styles, /search-transition|search-progress-card|brand-scan/);
  assert.match(styles, /is-search-leaving/);
  assert.doesNotMatch(view, /\$1,204|techprodeals|Apple warranty|12 offers/);
});

test("search is the single canonical product discovery experience", async () => {
  const [home, page, launcher, search, header, styles, alerts, results, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/search/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SearchLauncher.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/KelusHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/alerts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/results-v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /SearchLauncher/);
  assert.match(home, /SearchLauncher/);
  assert.match(home, /LiveShowcase compact/);
  assert.match(home, /HomepageSocialProof/);
  assert.match(home, /OnboardingTour/);
  assert.match(home, /trust-disclosure/);
  assert.doesNotMatch(home, /SearchControls/);
  assert.match(launcher, /href="\/search"/);
  assert.match(page, /SearchControls minimal minimalAction deferProductSelection focusOnMount/);
  assert.match(page, /search-category-nav/);
  assert.match(page, /alternates: \{ canonical: "https:\/\/kelus\.me\/search" \}/);
  assert.match(page, /LiveShowcase/);
  assert.match(page, /getSearchQuickStarts/);
  assert.doesNotMatch(page, /redirect\(/);
  assert.match(search, /hero-search-category/);
  assert.match(header, /href: "\/search", label: "Search"/);
  assert.match(styles, /\.hero-search-launcher/);
  assert.match(styles, /\.category-hub/);
  assert.match(alerts, /emailed when your target is reached/);
  assert.match(results, /href="\/search">Edit search/);
  assert.match(layout, /SiteJsonLd/);
  assert.doesNotMatch(alerts + results, /#product-search/);
});

test("key pages use specific metadata and the homepage demonstrates the differentiator", async () => {
  const [home, how, alerts, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/how-it-works/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/alerts/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /A cheaper listing can still lose/);
  assert.match(home, /Kelus — Find the offer worth buying/);
  assert.match(how, /How Kelus evaluates an electronics offer/);
  assert.match(alerts, /My price alerts — Kelus/);
  assert.doesNotMatch(layout, /warranty/);
});

test("Alerts leads with monitoring state and keeps secondary controls progressive", async () => {
  const [alerts, styles] = await Promise.all([
    readFile(new URL("../app/alerts/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(alerts, /Know when it’s worth buying/);
  assert.match(alerts, /Current best/);
  assert.match(alerts, /Price verified/);
  assert.match(alerts, /No validated offer/);
  assert.match(alerts, /Saved price may be stale/);
  assert.doesNotMatch(alerts, /Loading your alerts/);
  assert.match(alerts, /aria-live="polite"/);
  assert.match(alerts, /View comparison/);
  assert.match(alerts, /Check prices/);
  assert.match(alerts, /checkGuestPrices/);
  assert.match(alerts, /<progress value=\{progress\}/);
  assert.match(styles, /\.alerts-overview/);
  assert.match(styles, /\.alerts-refresh-button/);
  assert.match(styles, /\.alert-glance/);
  assert.match(styles, /\.alert-check\.is-error/);
});

test("authentication hydrates from local session and cannot leave Alerts stuck loading", async () => {
  const auth = await readFile(new URL("../components/AuthProvider.tsx", import.meta.url), "utf8");
  assert.match(auth, /getSession/);
  assert.match(auth, /authTimeout/);
  assert.match(auth, /1_500/);
  assert.match(auth, /\.catch\(\(\) =>/);
  assert.match(auth, /clearTimeout\(authTimeout\)/);
  assert.match(auth, /getUser\(\)/);
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

test("outstanding UX surfaces explain confidence, history progress, and catalog availability", async () => {
  const [view, coverage, category, search, confidence, availability] = await Promise.all([
    readFile(new URL("../app/results-v2/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/coverage/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/search/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ConfidenceBadge.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/catalog-availability.ts", import.meta.url), "utf8"),
  ]);
  assert.match(view, /ConfidenceBadge/);
  assert.match(view, /Collecting price data/);
  assert.match(view, /Comparison not ready yet/);
  assert.match(coverage, /CatalogAvailabilityLegend/);
  assert.match(coverage, /getProductCardStatus/);
  assert.match(category, /getProductCardStatus/);
  assert.match(search, /getProductCardStatus/);
  assert.match(confidence, /How Kelus scores confidence/);
  assert.match(availability, /View comparison/);
});

test("discovery cards can show listing images from bundled snapshots", async () => {
  const [catalog, image, card] = await Promise.all([
    readFile(new URL("../lib/bundled-snapshot-catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/CatalogProductImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ProductListingCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(catalog, /listingImageFromSnapshot/);
  assert.match(catalog, /listingImageUrl/);
  assert.match(image, /optimizedRetailerImageUrl/);
  assert.match(card, /CatalogProductImage/);
});

test("growth surfaces expose the product directory and snapshot-aware sitemap", async () => {
  const [productsPage, sitemapSource, listingCard] = await Promise.all([
    readFile(new URL("../app/products/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/ProductListingCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(productsPage, /listProductListingPreviews/);
  assert.match(productsPage, /ProductsDirectory/);
  assert.match(sitemapSource, /snapshotSitemapEntry/);
  assert.match(sitemapSource, /\/products/);
  assert.match(listingCard, /getProductCardStatus/);
});

test("trust surfaces expose footer links and coverage catalog", async () => {
  const [home, coverage, privacy, terms, footer, sitemap] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/coverage/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/terms/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);
  assert.match(home, /SiteFooter/);
  assert.match(coverage, /What Kelus covers/);
  assert.match(coverage, /getProductCardStatus/);
  assert.match(privacy, /Privacy policy/);
  assert.match(terms, /Terms of use/);
  assert.match(footer, /href="\/products"/);
  assert.match(footer, /href="\/coverage"/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
  assert.match(sitemap, /\/coverage/);
  assert.match(sitemap, /\/privacy/);
  assert.match(sitemap, /\/terms/);
});

test("production navigation avoids the incompatible client-side link shim", async () => {
  const [header, results, search] = await Promise.all([
    readFile(new URL("../components/KelusHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/results/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SearchControls.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(header + results, /from ["']next\/link["']/);
  assert.match(header, /SafeLink/);
  assert.match(header, /href: "\/search", label: "Search"/);
  assert.match(header, /Methodology/);
  assert.match(results + search, /window\.location\.assign/);
  assert.match(search, /canonicalProductPath\(criteria\)/);
  assert.match(search, /ProductInterestCapture/);
  assert.match(search, /searchIssue\.kind === "unsupported" \|\| searchIssue\.kind === "ambiguous"/);
  assert.doesNotMatch(search, /startSearch/);
});
