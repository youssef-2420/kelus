export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export type KelusAnalyticsEvent =
  | { name: "setup_started" }
  | { name: "setup_completed"; available_minutes: number }
  | { name: "waitlist_joined"; source: string }
  | { name: "question_submitted"; source: string; delivery?: "remote" | "local" | "needs_activation" }
  | { name: "material_confirmed"; concept_count: number }
  | { name: "material_upload_started"; role: string }
  | { name: "material_upload_completed"; role: string }
  | { name: "material_upload_failed"; role: string }
  | { name: "concept_review_started"; concept_count: number }
  | { name: "concept_review_updated"; action: "selected" | "removed" }
  | { name: "diagnosis_completed"; retrieval_count: number }
  | { name: "first_route_ready"; elapsed_ms: number; concept_count: number }
  | { name: "session_started" }
  | { name: "session_resumed" }
  | { name: "session_abandoned" }
  | { name: "session_completed"; concept_count: number; planned_minutes: number }
  | { name: "session_usefulness_rated"; helpful: boolean }
  | { name: "next_route_opened"; source: "completion" | "calendar" }
  | { name: "reminder_downloaded" }
  | { name: "nudges_enabled" }
  | { name: "today_opened"; returning: boolean; has_next_route: boolean }
  | { name: "route_recalculated"; changed: boolean; outcome: "partial" | "failure" }
  | { name: "sample_loaded"; source: string }
  | { name: "pricing_viewed"; source: string }
  | { name: "soft_paywall_shown"; moment: "first_session" | "third_material" }
  | { name: "subscription_checkout_clicked"; source: string };

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID) && typeof window !== "undefined";
}

export function trackEvent(event: KelusAnalyticsEvent) {
  if (!analyticsEnabled() || typeof window.gtag !== "function") return;
  const { name, ...parameters } = event;
  window.gtag("event", name, parameters);
}
