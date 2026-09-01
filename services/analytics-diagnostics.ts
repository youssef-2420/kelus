import { getProductBySlug } from "../lib/demo-data.ts";
import { applySnapshotTrustGate } from "./snapshot-trust.ts";
import { getRecommendation, knownOfferTotal } from "./recommendations.ts";
import { listTopProductInterestRequests } from "./server-product-interest.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";

type QueryResult<T> = { results?: T[] };
export type DiagnosticsDatabase = { prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<QueryResult<T>> } } };

type CountRow = { label: string; count: number };
type SnapshotAuditRow = { canonical_product_id: string; variant_id: string; condition: string; market: string; result_json: string; fetched_at: string };
export type RecommendationQualityAudit = { product: string; configuration: string; condition: string; status: "PASS" | "REVIEW" | "FAIL"; offerCount: number; confidence: string; lastUpdated: string | null; reasons: string[] };

async function rows<T>(db: DiagnosticsDatabase, sql: string, ...bindings: unknown[]) {
  return (await db.prepare(sql).bind(...bindings).all<T>()).results ?? [];
}

const validEbayDestination = (value?: string | null) => {
  try { return Boolean(value && /(^|\.)ebay\./i.test(new URL(value).hostname)); } catch { return false; }
};

function auditSnapshot(productSlug: string, row: SnapshotAuditRow | undefined, now: Date): RecommendationQualityAudit {
  const product = getProductBySlug(productSlug);
  const fallback = { product: product?.name ?? productSlug, configuration: row?.variant_id ?? "No snapshot", condition: row?.condition ?? "—", offerCount: 0, confidence: "Unavailable", lastUpdated: row?.fetched_at ?? null };
  if (!product || !row) return { ...fallback, status: "FAIL", reasons: [product ? "No persisted offer snapshot exists." : "Catalog product could not be resolved."] };
  if (row.market !== "us" || !["any", "new", "used", "refurbished"].includes(row.condition)) return { ...fallback, status: "FAIL", reasons: ["Snapshot identity is invalid."] };
  const criteria: SearchCriteria = { productSlug, variantId: row.variant_id || undefined, condition: row.condition as SearchCriteria["condition"], market: "us" };
  let parsed: OfferSearchResult;
  try { parsed = JSON.parse(row.result_json) as OfferSearchResult; } catch { return { ...fallback, status: "FAIL", reasons: ["Snapshot data is malformed."] }; }
  const trusted = applySnapshotTrustGate(criteria, parsed);
  if (!trusted) return { ...fallback, status: "FAIL", reasons: ["Snapshot no longer passes the current Trust Gate."] };
  if (!trusted.offers.length) return { ...fallback, status: "FAIL", reasons: ["Snapshot contains no comparable offers."] };
  const recommendation = getRecommendation(trusted.offers, "kelus_pick");
  const pick = trusted.offers.find((offer) => offer.id === recommendation?.offerId);
  const failures: string[] = [];
  const reviews: string[] = [];
  if (!pick) failures.push("No recommendation-quality Our Pick is available.");
  else {
    if (!pick.trust?.eligibleForRecommendation || pick.trust.confidence === "LOW") failures.push("Our Pick does not have recommendation-quality trust evidence.");
    if (knownOfferTotal(pick) === null) failures.push("Our Pick has no known total including shipping.");
    if (!validEbayDestination(pick.affiliateUrl)) failures.push("Our Pick destination is not a valid eBay listing URL.");
    if (!recommendation?.reasons.length || recommendation.reasons.some((reason) => /unknown|unavailable/i.test(reason))) failures.push("Why-this-one evidence is incomplete.");
    if (pick.trust?.confidence === "MEDIUM") reviews.push("Our Pick has medium rather than high confidence.");
    if (!pick.seller.name || pick.seller.feedbackPercentage === undefined) reviews.push("Seller evidence is limited.");
  }
  const invalidDestinations = trusted.offers.filter((offer) => !validEbayDestination(offer.affiliateUrl)).length;
  if (invalidDestinations) failures.push(`${invalidDestinations} retained offer destination${invalidDestinations === 1 ? " is" : "s are"} invalid.`);
  const ageMs = now.getTime() - Date.parse(row.fetched_at);
  if (Number.isNaN(ageMs) || ageMs < 0) failures.push("Snapshot timestamp is invalid.");
  else if (ageMs > 24 * 60 * 60 * 1_000) reviews.push("Snapshot is more than 24 hours old.");
  if (trusted.lastRefreshFailed) reviews.push("The latest provider refresh failed; last-known-good data is being served.");
  if (trusted.lastRefreshReturnedEmpty) reviews.push("The latest refresh returned no valid offers; last-known-good data is being served.");
  const reasons = failures.length ? failures : reviews.length ? reviews : ["Exact identity, known total, recommendation evidence, destination, and freshness checks passed."];
  return { ...fallback, offerCount: trusted.offers.length, confidence: pick?.trust?.confidence ?? "Unavailable", status: failures.length ? "FAIL" : reviews.length ? "REVIEW" : "PASS", reasons };
}

async function recommendationQualityAudits(db: DiagnosticsDatabase, products: CountRow[], now: Date) {
  const canonicalIds = products.flatMap((row) => { const product = getProductBySlug(row.label); return product ? [product.id] : []; });
  if (!canonicalIds.length) return products.map((row) => auditSnapshot(row.label, undefined, now));
  const placeholders = canonicalIds.map(() => "?").join(",");
  const snapshots = await rows<SnapshotAuditRow>(db, `SELECT canonical_product_id, variant_id, condition, market, result_json, fetched_at FROM product_intelligence_snapshots WHERE canonical_product_id IN (${placeholders}) ORDER BY fetched_at DESC`, ...canonicalIds);
  const latest = new Map<string, SnapshotAuditRow>();
  for (const row of snapshots) if (!latest.has(row.canonical_product_id)) latest.set(row.canonical_product_id, row);
  return products.map((row) => { const product = getProductBySlug(row.label); return auditSnapshot(row.label, product ? latest.get(product.id) : undefined, now); });
}

export async function getAnalyticsDiagnostics(db: DiagnosticsDatabase | undefined, now = new Date()) {
  if (!db) throw new Error("Analytics storage is unavailable.");
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [events, products, unsupported, interestRequests, outcomes] = await Promise.all([
    rows<CountRow>(db, `SELECT event_name AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? GROUP BY event_name`, since),
    rows<CountRow>(db, `SELECT product_slug AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name = 'product_resolved' AND product_slug IS NOT NULL GROUP BY product_slug ORDER BY count DESC LIMIT 10`, since),
    rows<CountRow>(db, `SELECT query AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name = 'search_unsupported' AND query IS NOT NULL GROUP BY query ORDER BY count DESC LIMIT 10`, since),
    listTopProductInterestRequests(db, since, 10),
    rows<CountRow>(db, `SELECT CASE WHEN event_name = 'live_provider_search_failed' THEN 'Provider failures' WHEN offer_count = 0 THEN 'Zero valid offers' ELSE 'Successful offer refreshes' END AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name IN ('live_provider_search_completed','live_provider_search_failed') GROUP BY label`, since),
  ]);
  const counts = Object.fromEntries(events.map((row) => [row.label, Number(row.count)]));
  const recommendationQuality = await recommendationQualityAudits(db, products, now);
  const ratio = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 1_000) / 10 : null;
  return {
    generatedAt: now.toISOString(), periodDays: 30,
    funnel: {
      landings: counts.landing_viewed ?? 0,
      searches: counts.search_submitted ?? 0,
      productsResolved: counts.product_resolved ?? 0,
      productViews: counts.product_page_viewed ?? 0,
      recommendations: counts.recommendation_viewed ?? 0,
      retailerClicks: counts.retailer_clicked ?? 0,
      alertsCreated: counts.price_alert_created ?? 0,
      interestCaptured: counts.product_interest_captured ?? 0,
      retailerClickRate: ratio(counts.retailer_clicked ?? 0, counts.recommendation_viewed ?? 0),
      alertConversionRate: ratio(counts.price_alert_created ?? 0, counts.product_page_viewed ?? 0),
      interestCaptureRate: ratio(counts.product_interest_captured ?? 0, counts.search_unsupported ?? 0),
    },
    topProducts: products.map((row) => ({ label: row.label, count: Number(row.count) })),
    unsupportedSearches: unsupported.map((row) => ({ label: row.label, count: Number(row.count) })),
    productInterestRequests: interestRequests,
    providerOutcomes: outcomes.map((row) => ({ label: row.label, count: Number(row.count) })),
    recommendationQuality,
  };
}

export function authorizeDiagnostics(request: Request, secret?: string) {
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !token || secret.length !== token.length) return false;
  let mismatch = 0;
  for (let index = 0; index < secret.length; index += 1) mismatch |= secret.charCodeAt(index) ^ token.charCodeAt(index);
  return mismatch === 0;
}
