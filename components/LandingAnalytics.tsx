"use client";

import { useEffect } from "react";
import { trackEvent } from "@/services/analytics";

export function LandingAnalytics() {
  useEffect(() => { trackEvent({ name: "landing_viewed" }); }, []);
  return null;
}
