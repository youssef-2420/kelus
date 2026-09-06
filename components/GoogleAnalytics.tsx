import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { GoogleAnalyticsPageViews } from "@/components/GoogleAnalyticsPageViews";

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  const measurementId = JSON.stringify(GA_MEASUREMENT_ID);
  const bootstrap = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
window.gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "granted"
});
window.gtag("js", new Date());
window.gtag("config", ${measurementId}, {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  anonymize_ip: true
});
`;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="kelus-ga-bootstrap" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <GoogleAnalyticsPageViews />
    </>
  );
}
