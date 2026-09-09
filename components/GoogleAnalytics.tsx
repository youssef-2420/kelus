"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_KEY,
  GA_MEASUREMENT_ID,
  type AnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics";
import { GoogleAnalyticsPageViews } from "@/components/GoogleAnalyticsPageViews";
import { AnalyticsConsentBanner } from "@/components/AnalyticsConsentBanner";

const CONSENT_DEFAULT = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
window.gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied"
});
`;

function applyConsentUpdate(value: AnalyticsConsent) {
  if (typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: value === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConsent(readAnalyticsConsent());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_KEY) return;
      setConsent(readAnalyticsConsent());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  const choose = useCallback((value: AnalyticsConsent) => {
    writeAnalyticsConsent(value);
    applyConsentUpdate(value);
    setConsent(value);
  }, []);

  if (!GA_MEASUREMENT_ID) return null;

  const measurementId = JSON.stringify(GA_MEASUREMENT_ID);
  const granted = consent === "granted";
  const undecided = hydrated && consent === null;

  const configBootstrap = `
window.gtag("consent", "update", {
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied"
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
      <Script id="kelus-ga-consent-default" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
      {granted ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="kelus-ga-bootstrap" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: configBootstrap }} />
          <GoogleAnalyticsPageViews />
        </>
      ) : null}
      {undecided ? <AnalyticsConsentBanner onAccept={() => choose("granted")} onDecline={() => choose("denied")} /> : null}
    </>
  );
}
