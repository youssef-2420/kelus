"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, analyticsEnabled } from "@/lib/analytics";

export function GoogleAnalyticsPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (!analyticsEnabled() || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: `${pathname}${window.location.search}`,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [pathname]);

  return null;
}
