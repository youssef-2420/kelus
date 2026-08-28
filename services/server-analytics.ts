const allowedEvents = new Set([
  "landing_viewed", "search_submitted", "product_resolved", "search_unsupported", "product_page_viewed",
  "recommendation_viewed", "our_pick_clicked", "retailer_clicked", "price_alert_created",
]);

export type AnalyticsDatabase = { prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } };

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const cleanQuery = (value: unknown) => clean(typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ") : null, 120);

export async function storeAnalyticsEvent(db: AnalyticsDatabase | undefined, payload: unknown, now = new Date()) {
  if (!db || !payload || typeof payload !== "object") return false;
  const event = payload as Record<string, unknown>;
  const eventName = clean(event.name, 48);
  if (!eventName || !allowedEvents.has(eventName)) return false;
  await db.prepare(`INSERT INTO analytics_events (
    event_name, product_slug, variant_id, condition, offer_id, query, occurred_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(eventName, clean(event.productSlug, 100), clean(event.variantId, 120), clean(event.condition, 24), clean(event.offerId, 180), eventName === "search_unsupported" ? cleanQuery(event.query) : null, now.toISOString())
    .run();
  return true;
}
