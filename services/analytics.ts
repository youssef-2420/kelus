import { normalizeSearchQuery } from "../lib/normalize-search-query.ts";

export type KelusAnalyticsEvent =
  | { name: "landing_viewed" }
  | { name: "search_submitted"; productSlug: string; query?: string }
  | { name: "search_started"; productSlug: string }
  | { name: "search_completed"; productSlug: string }
  | { name: "search_partial"; productSlug: string }
  | { name: "search_failed"; productSlug: string }
  | { name: "search_unsupported"; query: string }
  | { name: "product_interest_captured"; query: string }
  | { name: "product_resolved"; productSlug: string; variantId?: string; condition: string }
  | { name: "product_page_viewed"; productSlug: string; variantId?: string; condition: string }
  | { name: "recommendation_viewed"; productSlug: string; offerId?: string; confidence?: string }
  | { name: "product_selected"; productSlug: string }
  | { name: "filter_changed"; filter: string }
  | { name: "offer_compared"; offerId: string }
  | { name: "retailer_clicked"; offerId: string }
  | { name: "our_pick_clicked"; productSlug?: string; offerId: string }
  | { name: "price_alert_created"; product: string; productSlug?: string; variantId?: string; condition?: string }
  | { name: "live_provider_search_started"; provider: "ebay"; productSlug: string }
  | { name: "live_provider_search_completed"; provider: "ebay"; productSlug: string; offerCount: number }
  | { name: "live_provider_search_failed"; provider: "ebay"; productSlug: string }
  | { name: "ebay_offer_viewed"; offerId: string }
  | { name: "provider_search_started"; provider: string; productSlug: string }
  | { name: "provider_search_completed"; provider: string; productSlug: string; offerCount: number }
  | { name: "provider_search_failed"; provider: string; productSlug: string }
  | { name: "offer_viewed"; offerId: string };

export type StoredKelusAnalyticsEvent = KelusAnalyticsEvent & { occurredAt: string };

const analyticsKey = "kelus:analytics:v1";
const unsupportedKey = "kelus:unsupported-searches:v1";
const maxStoredEvents = 200;
const persistedEvents = new Set(["landing_viewed", "search_submitted", "product_resolved", "search_unsupported", "product_interest_captured", "product_page_viewed", "recommendation_viewed", "our_pick_clicked", "retailer_clicked", "price_alert_created", "live_provider_search_completed", "live_provider_search_failed"]);

export function toGoogleAnalyticsEvent(event: KelusAnalyticsEvent) {
  const { name, ...values } = event;
  const parameters = Object.fromEntries(
    Object.entries(values).filter(([key, value]) =>
      key !== "query" && ["string", "number", "boolean"].includes(typeof value)
    ),
  );
  return { name, parameters };
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, values: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(values.slice(-maxStoredEvents)));
  } catch {
    // Analytics must never affect the shopping flow.
  }
}

export function trackEvent(event: KelusAnalyticsEvent) {
  if (typeof window === "undefined") return;
  const googleEvent = toGoogleAnalyticsEvent(event);
  window.gtag?.("event", googleEvent.name, googleEvent.parameters);
  const stored = { ...event, occurredAt: new Date().toISOString() } satisfies StoredKelusAnalyticsEvent;
  writeArray(analyticsKey, [...readArray<StoredKelusAnalyticsEvent>(analyticsKey), stored]);
  if (event.name === "search_unsupported") {
    const query = normalizeSearchQuery(event.query);
    if (query) writeArray(unsupportedKey, [...readArray<string>(unsupportedKey), query]);
  }
  if (persistedEvents.has(event.name)) {
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event), keepalive: true }).catch(() => undefined);
  }
}

export function readStoredAnalyticsEvents() {
  return readArray<StoredKelusAnalyticsEvent>(analyticsKey);
}

export function readUnsupportedSearches() {
  return readArray<string>(unsupportedKey);
}
