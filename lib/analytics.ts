export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export const ANALYTICS_CONSENT_KEY = "kelus:analytics-consent:v1";

export type AnalyticsConsent = "granted" | "denied";

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
  | { name: "diagnosis_completed"; retrieval_count: number }
  | { name: "first_route_ready"; elapsed_ms: number; concept_count: number }
  | { name: "session_started" }
  | { name: "session_resumed" }
  | { name: "session_abandoned" }
  | { name: "session_completed"; concept_count: number; planned_minutes: number }
  | { name: "route_recalculated"; changed: boolean; outcome: "partial" | "failure" }
  | { name: "sample_loaded"; source: string }
  | { name: "pricing_viewed"; source: string }
  | { name: "soft_paywall_shown"; moment: "first_session" | "third_material" }
  | { name: "exam_pass_checkout_clicked"; source: string }
  | { name: "exam_pass_activated"; source: string };

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    /* Storage may be blocked; treat as undecided. */
  }
  return null;
}

export function writeAnalyticsConsent(value: AnalyticsConsent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    /* Ignore quota / private-mode failures. */
  }
}

export function analyticsConsentGranted() {
  return readAnalyticsConsent() === "granted";
}

export function analyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID) && typeof window !== "undefined" && analyticsConsentGranted();
}

export function trackEvent(event: KelusAnalyticsEvent) {
  if (!analyticsEnabled() || typeof window.gtag !== "function") return;
  const { name, ...parameters } = event;
  window.gtag("event", name, parameters);
}
