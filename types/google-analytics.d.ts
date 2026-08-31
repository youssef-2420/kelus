type GoogleAnalyticsParameter = string | number | boolean | undefined;

interface Window {
  dataLayer: IArguments[];
  gtag: (
    command: "js" | "config" | "event",
    targetOrEvent: Date | string,
    parameters?: Record<string, GoogleAnalyticsParameter>,
  ) => void;
}
