"use client";

import Link from "next/link";
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
    body: "Your first route is free. The planned $9 Exam Pass keeps one course, its learning evidence, and its changing route together through the exam date you set.",
  },
  third_material: {
    title: "Keep this course together",
    body: "The planned $9 Exam Pass is for one exam: your course materials, learning evidence, and adaptive route kept together across devices until exam day.",
  },
};

export function SoftUpgradePrompt({ moment }: SoftUpgradePromptProps) {
  const [visible, setVisible] = useState(false);

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
        <p>{copy.body}</p>
      </div>
      <div className="soft-upgrade-actions">
        {foundingPaymentConfigured() ? (
          <a className="cta" href={foundingPaymentLink()} target="_blank" rel="noopener noreferrer">
            Get Exam Pass · $9
          </a>
        ) : (
          <Link href="/pricing/" className="cta">
            See pricing
          </Link>
        )}
        <button type="button" className="ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
