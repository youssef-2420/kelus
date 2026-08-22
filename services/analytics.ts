export type KelusAnalyticsEvent =
  | { name: "search_submitted"; productSlug: string }
  | { name: "search_started"; productSlug: string }
  | { name: "search_completed"; productSlug: string }
  | { name: "search_partial"; productSlug: string }
  | { name: "search_failed"; productSlug: string }
  | { name: "product_selected"; productSlug: string }
  | { name: "filter_changed"; filter: string }
  | { name: "offer_compared"; offerId: string }
  | { name: "retailer_clicked"; offerId: string }
  | { name: "price_alert_created"; product: string }
  | { name: "live_provider_search_started"; provider: "ebay"; productSlug: string }
  | { name: "live_provider_search_completed"; provider: "ebay"; productSlug: string; offerCount: number }
  | { name: "live_provider_search_failed"; provider: "ebay"; productSlug: string }
  | { name: "ebay_offer_viewed"; offerId: string }
  | { name: "provider_search_started"; provider: string; productSlug: string }
  | { name: "provider_search_completed"; provider: string; productSlug: string; offerCount: number }
  | { name: "provider_search_failed"; provider: string; productSlug: string }
  | { name: "offer_viewed"; offerId: string };

// Intentionally transport-free: a future analytics provider can subscribe here without changing UI components.
export function trackEvent(event: KelusAnalyticsEvent) { void event; }
