export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export type KelusAnalyticsEvent =
  | { name: "waitlist_joined"; source: string }
  | { name: "material_confirmed"; concept_count: number }
  | { name: "diagnosis_completed"; retrieval_count: number }
  | { name: "session_started" }
  | { name: "pricing_viewed"; source: string }
  | { name: "soft_paywall_shown"; moment: "first_session" | "third_material" }
  | { name: "founding_checkout_clicked"; source: string };

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID) && typeof window !== "undefined";
}

export function trackEvent(event: KelusAnalyticsEvent) {
  if (!analyticsEnabled() || typeof window.gtag !== "function") return;
  const { name, ...parameters } = event;
  window.gtag("event", name, parameters);
}
