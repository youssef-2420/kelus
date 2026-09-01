import { normalizeSearchQuery } from "../lib/normalize-search-query.ts";

const allowedEvents = new Set([
  "landing_viewed", "search_submitted", "product_resolved", "search_unsupported", "product_page_viewed",
  "recommendation_viewed", "our_pick_clicked", "retailer_clicked", "price_alert_created",
  "live_provider_search_completed", "live_provider_search_failed", "product_interest_captured",
]);

export type AnalyticsDatabase = { prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } };

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const cleanQuery = (value: unknown) => clean(typeof value === "string" ? normalizeSearchQuery(value) : null, 120);

export async function storeAnalyticsEvent(db: AnalyticsDatabase | undefined, payload: unknown, now = new Date()) {
  if (!db || !payload || typeof payload !== "object") return false;
  const event = payload as Record<string, unknown>;
  const eventName = clean(event.name, 48);
  if (!eventName || !allowedEvents.has(eventName)) return false;
  await db.prepare(`INSERT INTO analytics_events (
    event_name, product_slug, variant_id, condition, offer_id, query, offer_count, occurred_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(eventName, clean(event.productSlug, 100), clean(event.variantId, 120), clean(event.condition, 24), clean(event.offerId, 180), eventName === "search_unsupported" || eventName === "product_interest_captured" ? cleanQuery(event.query) : null, Number.isInteger(event.offerCount) ? Math.max(0, Number(event.offerCount)) : null, now.toISOString())
    .run();
  return true;
}
