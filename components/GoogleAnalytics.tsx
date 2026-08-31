import { GoogleAnalyticsPageViews } from "@/components/GoogleAnalyticsPageViews";

export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-B4WD58PYF6";

const measurementId = JSON.stringify(GOOGLE_ANALYTICS_ID);
const bootstrap = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
window.gtag("js", new Date());
window.gtag("config", ${measurementId}, {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
`;

export function GoogleAnalytics() {
  return <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`} />
    <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
    <GoogleAnalyticsPageViews />
  </>;
}
