"use client";

import { WaitlistForm } from "@/components/WaitlistForm";
import { foundingPaymentConfigured, foundingPaymentLink } from "@/lib/founding";
import { trackEvent } from "@/lib/analytics";

export function FoundingCta({ source = "pricing" }: { source?: string }) {
  const paymentReady = foundingPaymentConfigured();
  const paymentLink = foundingPaymentLink();

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
          One exam, one payment. Access follows the exam date you set in Kelus.
        </p>
      </div>
    );
  }

  return (
    <div className="founding-cta">
      <WaitlistForm source={source} compact />
      <p className="founding-cta-note">
        Checkout is not live yet. Join the list to reserve the $9 Exam Pass launch price.
      </p>
    </div>
  );
}
