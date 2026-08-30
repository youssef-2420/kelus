type QueryResult<T> = { results?: T[] };
export type DiagnosticsDatabase = { prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<QueryResult<T>> } } };

type CountRow = { label: string; count: number };

async function rows<T>(db: DiagnosticsDatabase, sql: string, ...bindings: unknown[]) {
  return (await db.prepare(sql).bind(...bindings).all<T>()).results ?? [];
}

export async function getAnalyticsDiagnostics(db: DiagnosticsDatabase | undefined, now = new Date()) {
  if (!db) throw new Error("Analytics storage is unavailable.");
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [events, products, unsupported, outcomes] = await Promise.all([
    rows<CountRow>(db, `SELECT event_name AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? GROUP BY event_name`, since),
    rows<CountRow>(db, `SELECT product_slug AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name = 'product_resolved' AND product_slug IS NOT NULL GROUP BY product_slug ORDER BY count DESC LIMIT 10`, since),
    rows<CountRow>(db, `SELECT query AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name = 'search_unsupported' AND query IS NOT NULL GROUP BY query ORDER BY count DESC LIMIT 10`, since),
    rows<CountRow>(db, `SELECT CASE WHEN event_name = 'live_provider_search_failed' THEN 'Provider failures' WHEN offer_count = 0 THEN 'Zero valid offers' ELSE 'Successful offer refreshes' END AS label, COUNT(*) AS count FROM analytics_events WHERE occurred_at >= ? AND event_name IN ('live_provider_search_completed','live_provider_search_failed') GROUP BY label`, since),
  ]);
  const counts = Object.fromEntries(events.map((row) => [row.label, Number(row.count)]));
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
      retailerClickRate: ratio(counts.retailer_clicked ?? 0, counts.recommendation_viewed ?? 0),
      alertConversionRate: ratio(counts.price_alert_created ?? 0, counts.product_page_viewed ?? 0),
    },
    topProducts: products.map((row) => ({ label: row.label, count: Number(row.count) })),
    unsupportedSearches: unsupported.map((row) => ({ label: row.label, count: Number(row.count) })),
    providerOutcomes: outcomes.map((row) => ({ label: row.label, count: Number(row.count) })),
  };
}

export function authorizeDiagnostics(request: Request, secret?: string) {
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !token || secret.length !== token.length) return false;
  let mismatch = 0;
  for (let index = 0; index < secret.length; index += 1) mismatch |= secret.charCodeAt(index) ^ token.charCodeAt(index);
  return mismatch === 0;
}
