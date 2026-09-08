"use client";

import Link from "next/link";
import { authConfigured } from "@/lib/auth-config";
import { foundingPaymentConfigured, foundingPaymentLink } from "@/lib/founding";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ExamCoveragePlan } from "@/domain/exam-coverage";
import { examCoverageHeadline } from "@/domain/exam-coverage";

export const PAYWALL_DISMISS_KEY = "kelus:paywall:dismissed:v1";

type SoftUpgradePromptProps = {
  moment: "first_session" | "third_material";
  coverage?: ExamCoveragePlan | null;
};

export function SoftUpgradePrompt({ moment, coverage }: SoftUpgradePromptProps) {
  const [visible, setVisible] = useState(false);
  const paymentReady = foundingPaymentConfigured();
  const syncReady = authConfigured();

  useEffect(() => {
    let active = true;
    try {
      if (window.localStorage.getItem(PAYWALL_DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      if (active) setVisible(true);
    });
    trackEvent({ name: "soft_paywall_shown", moment });
    return () => {
      active = false;
    };
  }, [moment]);

  if (!visible) return null;

  const title = moment === "first_session"
    ? "See the rest of the days until your exam"
    : "Don’t leave topics off the calendar";
  const coverageLine = coverage
    ? examCoverageHeadline(coverage)
    : "Exam Pass names which remaining days get which topics, at the daily minutes you set.";
  const body = `${coverageLine} Today’s route stays free.${syncReady ? " Sign in free anytime to sync this course across devices." : " Your learning stays on this device."}`;

  function dismiss() {
    try {
      window.localStorage.setItem(PAYWALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <aside className="soft-upgrade" aria-label="Exam Pass offer">
      <div className="soft-upgrade-copy">
        <p className="soft-upgrade-kicker">Exam Pass</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="soft-upgrade-actions">
        {paymentReady ? (
          <a className="cta" href={foundingPaymentLink()} target="_blank" rel="noopener noreferrer">
            Unlock remaining days · $9
          </a>
        ) : (
          <Link href="/pricing/" className="cta">
            See Exam Pass options
          </Link>
        )}
        <button type="button" className="ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
