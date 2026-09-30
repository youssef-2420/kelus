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
          onClick={() => trackEvent({ name: "subscription_checkout_clicked", source })}
        >
          Get Kelus Plus · $4.99/month <span aria-hidden="true">→</span>
        </a>
        <p className="founding-cta-note">
          Monthly subscription. Your free revision and account sync are still available without Plus.
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
          ? "Get a quiet update when $4.99/month subscriptions open. Free revision stays available now."
          : "Email hello@kelus.me for an update when $4.99/month subscriptions open. Free revision stays available now."}
        {syncReady
          ? " Sync across devices is already available with free sign-in."
          : " Routes stay on this device for now."}
      </p>
      {waitlistReady ? <WaitlistForm source={source} compact /> : (
        <a className="text-btn" href="mailto:hello@kelus.me?subject=Kelus%20Plus%20subscription">
          Ask about Kelus Plus <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}
