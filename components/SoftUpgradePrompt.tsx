"use client";

import Link from "next/link";
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
    title: "Keep this rhythm for the term",
    body: "Founding student is $9/term while we grow. Free stays usable on this device — founding is for sync, multi-course, and priority access when billing opens.",
  },
  third_material: {
    title: "You’re stacking materials",
    body: "Free already plans today’s route on this device. Founding student is for sync across devices, multi-course workspace, and priority access when billing opens — $9/term.",
  },
};

export function SoftUpgradePrompt({ moment }: SoftUpgradePromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(PAYWALL_DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
    trackEvent({ name: "soft_paywall_shown", moment });
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
    <aside className="soft-upgrade" aria-label="Founding student offer">
      <div className="soft-upgrade-copy">
        <p className="soft-upgrade-kicker">Founding student</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <div className="soft-upgrade-actions">
        <Link href="/pricing/" className="cta">
          See pricing
        </Link>
        <button type="button" className="ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
