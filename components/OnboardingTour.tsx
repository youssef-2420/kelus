"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

const storageKey = "kelus:onboarding:v2";

const steps = [
  {
    title: "Search the exact configuration",
    body: "Pick the product, storage, and condition you actually want — not a generic model name.",
    cta: { href: "#product-search", label: "Back to search" },
  },
  {
    title: "Compare validated offers",
    body: "Kelus shows known totals, seller evidence, and why Our Pick beat cheaper listings.",
    cta: { href: "/products", label: "Browse live comparisons" },
  },
  {
    title: "Track and get notified",
    body: "Save a price alert on this device, or sign in to get emailed when your target is reached.",
    cta: { href: "/alerts", label: "Open My alerts" },
  },
];

type Props = {
  /** When true, show a quiet trigger instead of auto-opening over the task. */
  withTrigger?: boolean;
};

export function OnboardingTour({ withTrigger = true }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "done");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function finish() {
    try { window.localStorage.setItem(storageKey, "done"); } catch { /* ignore */ }
    setDismissed(true);
    setOpen(false);
  }

  function openTour() {
    setStep(0);
    setOpen(true);
  }

  const current = steps[step];
  const last = step === steps.length - 1;

  return (
    <>
      {withTrigger && !dismissed && !open ? (
        <button type="button" className="desk-tour-trigger" onClick={openTour}>
          How searching works <Icon name="arrow" size={14} />
        </button>
      ) : null}
      {open ? (
        <div className="onboarding-tour" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <button type="button" className="onboarding-tour-backdrop" aria-label="Dismiss tour" onClick={finish} />
          <div className="onboarding-tour-card">
            <p className="onboarding-tour-step">Step {step + 1} of {steps.length}</p>
            <h2 id="onboarding-title">{current.title}</h2>
            <p>{current.body}</p>
            <div className="onboarding-tour-steps" aria-hidden="true">
              {steps.map((item, index) => (
                <span key={item.title} className={index === step ? "is-active" : index < step ? "is-done" : ""} />
              ))}
            </div>
            <div className="onboarding-tour-actions">
              <button type="button" className="button button-secondary" onClick={finish}>Skip tour</button>
              {last
                ? <button type="button" className="button button-primary" onClick={finish}>Got it</button>
                : <button type="button" className="button button-primary" onClick={() => setStep((value) => value + 1)}>Next</button>}
              <Link className="text-link onboarding-tour-link" href={current.cta.href} onClick={finish}>
                {current.cta.label} <Icon name="arrow" size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
