type GoogleAnalyticsParameter = string | number | boolean | undefined;

interface Window {
  dataLayer: unknown[];
  gtag?: (
    command: "js" | "config" | "event" | "consent",
    targetOrDateOrEvent: Date | string,
    parameters?: Record<string, GoogleAnalyticsParameter>,
  ) => void;
}
