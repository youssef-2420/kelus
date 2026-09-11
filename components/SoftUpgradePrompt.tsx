"use client";

import Link from "next/link";
import { authConfigured } from "@/lib/auth-config";
import { foundingPaymentConfigured, foundingPaymentLink } from "@/lib/founding";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export const PAYWALL_DISMISS_KEY = "kelus:paywall:dismissed:v1";

type SoftUpgradePromptProps = {
  moment: "first_session" | "third_material";
};

const COPY: Record<
  SoftUpgradePromptProps["moment"],
  { title: string; body: string }
> = {
  first_session: {
    title: "Take this route to exam day",
    body: "Your first route is free. Exam Pass ($9.99) will add priority support through the exam date you set when checkout opens.",
  },
  third_material: {
    title: "Keep this course together",
    body: "Exam Pass ($9.99) is for priority support through one exam. Checkout isn’t live yet — free revision stays available now.",
  },
};

export function SoftUpgradePrompt({ moment }: SoftUpgradePromptProps) {
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

  const copy = COPY[moment];
  const body = syncReady
    ? `${copy.body} Sign in free anytime to sync this course across devices.`
    : `${copy.body} Your learning stays on this device.`;

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
        <h2>{copy.title}</h2>
        <p>{body}</p>
      </div>
      <div className="soft-upgrade-actions">
        {paymentReady ? (
          <a className="cta" href={foundingPaymentLink()} target="_blank" rel="noopener noreferrer">
            Get Exam Pass · $9.99
          </a>
        ) : (
          <Link href="/pricing/" className="text-btn">
            Exam Pass coming soon
          </Link>
        )}
        <button type="button" className="ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
