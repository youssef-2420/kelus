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
          Get Exam Pass · $9.99 <span aria-hidden="true">→</span>
        </a>
        <p className="founding-cta-note">
          One exam, one payment. Priority support follows the exam date you set.
          {syncReady ? " Sync across devices is included with free sign-in." : " Study stays on this device until account sync is enabled."}
        </p>
      </div>
    );
  }

  return (
    <div className="founding-cta is-reserve">
      <p className="founding-cta-status">Checkout isn’t live yet</p>
      <p className="founding-cta-note">
        {waitlistReady
          ? "Reserve the $9.99 Exam Pass for when payments open. Free revision stays available now."
          : "Email hello@kelus.me to reserve the $9.99 Exam Pass. Free revision stays available now."}
        {syncReady
          ? " Sync across devices is already available with free sign-in."
          : " Routes stay on this device for now."}
      </p>
      {waitlistReady ? <WaitlistForm source={source} compact /> : (
        <a className="text-btn" href="mailto:hello@kelus.me?subject=Exam%20Pass%20interest">
          Email about Exam Pass <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}
