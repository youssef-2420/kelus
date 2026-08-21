export type KelusAnalyticsEvent = { name: "search_submitted"; productSlug: string } | { name: "search_completed"; productSlug: string } | { name: "search_partial"; productSlug: string } | { name: "search_failed"; productSlug: string } | { name: "product_selected"; productSlug: string } | { name: "filter_changed"; filter: string } | { name: "offer_compared"; offerId: string } | { name: "retailer_clicked"; offerId: string } | { name: "price_alert_created"; product: string };

// Intentionally transport-free: a future analytics provider can subscribe here without changing UI components.
export function trackEvent(event: KelusAnalyticsEvent) { void event; }
