"use client";

import { useEffect, useRef, useState } from "react";
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
    body: "Kelus shows known totals, seller evidence, and why bids on cheaper listings were passed over.",
    cta: { href: "/products", label: "Browse comparisons" },
  },
  {
    title: "Track and get notified",
    body: "Save a price alert on this device, or sign in to get emailed when your target is reached.",
    cta: { href: "/alerts", label: "Open My alerts" },
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      try { window.localStorage.setItem(storageKey, "done"); } catch { /* ignore */ }
      setOpen(false);
    }

    function handleTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleEscape);
    dialog?.addEventListener("keydown", handleTab);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      dialog?.removeEventListener("keydown", handleTab);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      trigger?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, step]);

  function persistDone() {
    try { window.localStorage.setItem(storageKey, "done"); } catch { /* ignore */ }
  }

  function finish() {
    persistDone();
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
      {!open ? (
        <button ref={triggerRef} type="button" className="desk-tour-trigger" onClick={openTour}>
          How searching works <Icon name="arrow" size={14} />
        </button>
      ) : null}
      {open ? (
        <div className="onboarding-tour">
          <button type="button" className="onboarding-tour-backdrop" tabIndex={-1} aria-label="Dismiss tour" onClick={finish} />
          <div
            ref={dialogRef}
            className="onboarding-tour-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
          >
            <div key={step} className="onboarding-tour-copy">
              <p className="onboarding-tour-step">Step {step + 1} of {steps.length}</p>
              <h2 id="onboarding-title">{current.title}</h2>
              <p>{current.body}</p>
            </div>
            <div className="onboarding-tour-steps" aria-hidden="true">
              {steps.map((item, index) => (
                <span key={item.title} className={index === step ? "is-active" : index < step ? "is-done" : ""} />
              ))}
            </div>
            <div className="onboarding-tour-actions">
              <button type="button" className="button button-secondary" onClick={finish}>Skip tour</button>
              <button
                ref={primaryRef}
                type="button"
                className="button button-primary"
                onClick={last ? finish : () => setStep((value) => value + 1)}
              >
                {last ? "Got it" : "Next"}
              </button>
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
