"use client";

import { WaitlistForm } from "@/components/WaitlistForm";
import { authConfigured } from "@/lib/auth-config";
import { foundingPaymentConfigured, foundingPaymentLink } from "@/lib/founding";
import { trackEvent } from "@/lib/analytics";
import { waitlistEndpointConfigured } from "@/lib/waitlist";

export function FoundingCta({ source = "pricing" }: { source?: string }) {
  const paymentReady = foundingPaymentConfigured();
  const paymentLink = foundingPaymentLink();
  const syncReady = authConfigured();
  const waitlistReady = waitlistEndpointConfigured();

  if (paymentReady) {
    return (
      <div className="founding-cta">
        <a
          className="cta"
          href={paymentLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent({ name: "exam_pass_checkout_clicked", source })}
        >
          Get Exam Pass · $9 <span aria-hidden="true">→</span>
        </a>
        <p className="founding-cta-note">
          One exam, one payment. Today’s route stays free. Exam Pass is the remaining days until the date you set.
          {syncReady ? " Sync across devices is included with free sign-in." : " Study stays on this device until account sync is enabled."}
        </p>
      </div>
    );
  }

  return (
    <div className="founding-cta">
      {waitlistReady ? <WaitlistForm source={source} compact /> : null}
      <p className="founding-cta-note">
        {waitlistReady
          ? "Checkout is not live yet. Join the list to reserve the $9 Exam Pass."
          : "Checkout is not live yet. Email hello@kelus.me to reserve the $9 Exam Pass."}
        {syncReady
          ? " Sync across devices is already available with free sign-in."
          : " Routes stay on this device for now."}
      </p>
      {!waitlistReady ? (
        <a className="cta" href="mailto:hello@kelus.me?subject=Exam%20Pass%20interest">
          Email about Exam Pass <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </div>
  );
}
