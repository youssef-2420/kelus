"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type AnalyticsConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export function AnalyticsConsentBanner({ onAccept, onDecline }: AnalyticsConsentBannerProps) {
  const reduce = useReducedMotion() === true;

  return (
    <AnimatePresence>
      <motion.div
        className="analytics-consent"
        role="dialog"
        aria-modal="false"
        aria-labelledby="analytics-consent-title"
        aria-describedby="analytics-consent-desc"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: 12 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      >
        <div className="analytics-consent-copy">
          <p id="analytics-consent-title" className="analytics-consent-title">
            Analytics
          </p>
          <p id="analytics-consent-desc">
            Kelus can use optional Google Analytics to understand which pages help. Ads stay off.{" "}
            <Link href="/privacy/">Privacy</Link>
          </p>
        </div>
        <div className="analytics-consent-actions">
          <button type="button" className="cta compact" onClick={onAccept}>
            Accept
          </button>
          <button type="button" className="ghost" onClick={onDecline}>
            Decline
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
