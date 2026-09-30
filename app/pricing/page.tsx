import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { PricingViewTracker } from "@/components/PricingViewTracker";
import { authConfigured } from "@/lib/auth-config";
import { foundingPaymentConfigured } from "@/lib/founding";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Start revising free. Kelus Plus is $4.99 per month when subscription checkout opens.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const syncReady = authConfigured();
  const paymentReady = foundingPaymentConfigured();

  return (
    <LateralPage>
    <div data-marketing="editorial" className="legal-page pricing-page is-booklet-product is-booklet-pricing is-monthly-pricing">
    <main id="main">
      <PricingViewTracker />
      <section className="legal-panel pricing-booklet">
        <p className="kicker">Pricing</p>
        <h1>Revision that fits your month.</h1>
        <p className="legal-lede">
          Start with Kelus for free. Move to Plus for $4.99 a month when subscriptions open.
          {syncReady
            ? " Sign in anytime to sync that progress across browsers."
            : " Your progress stays on this device."}
        </p>

        <div className="pricing-booklet-stack pricing-grid" role="list">
          <article className="pricing-offer is-free pricing-plan" role="listitem">
            <div className="pricing-offer-head">
              <p className="kicker">Free</p>
              <p className="pricing-price">$0<span>/month</span></p>
            </div>
            <h2>Start revising</h2>
            <p className="pricing-offer-lede">Everything you need to see how Kelus works with your course.</p>
            <ul>
              <li>Add your course and exam date</li>
              <li>Get topics to revise from your answer evidence</li>
              <li>Practise recall and application, then check your answers</li>
              <li>No account required</li>
              {syncReady ? <li>Optional free sign-in to sync across devices</li> : <li>Saved on this device</li>}
            </ul>
            <Link className="cta" href="/today">
              Start revising <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className={`pricing-offer is-pass pricing-plan is-founding${paymentReady ? "" : " is-upcoming"}`} role="listitem">
            <div className="pricing-offer-head">
              <p className="kicker">Kelus Plus {paymentReady ? "" : "· coming soon"}</p>
              <p className="pricing-price">
                $4.99<span>/month</span>
              </p>
            </div>
            <h2>More support as you study</h2>
            <p className="pricing-offer-lede">
              A monthly subscription for students who want priority support while they revise.
            </p>
            <ul>
              <li>Everything in Free{syncReady ? ", including optional sign-in sync" : ""}</li>
              <li>Priority access to new study features</li>
              <li>Direct email support while subscribed</li>
              <li>Monthly billing; no annual commitment</li>
            </ul>
            <FoundingCta source="pricing" />
          </article>
        </div>

        <p className="legal-inline-links">
          Questions? <a href="mailto:hello@kelus.me">hello@kelus.me</a>
          {" · "}
          <Link href="/questions">Ask a question</Link>
          {" · "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
    </main>
      <SiteFooter compact />
    </div>
  </LateralPage>
  );
}
