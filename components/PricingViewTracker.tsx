"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function PricingViewTracker() {
  useEffect(() => {
    trackEvent({ name: "pricing_viewed", source: "pricing_page" });
  }, []);
  return null;
}
