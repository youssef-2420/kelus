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
          onClick={() => trackEvent({ name: "founding_checkout_clicked", source })}
        >
          Join founding · $9/term <span aria-hidden="true">→</span>
        </a>
        <p className="founding-cta-note">
          Opens Stripe checkout. Founding covers sync and multi-course when those ship — Free stays local forever.
        </p>
      </div>
    );
  }

  return (
    <div className="founding-cta">
      <WaitlistForm source={source} compact />
      <p className="founding-cta-note">
        Payment isn’t live in this build yet. Join the list to claim the founding rate when checkout opens.
      </p>
    </div>
  );
}
