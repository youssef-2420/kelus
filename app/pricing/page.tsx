import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { PricingViewTracker } from "@/components/PricingViewTracker";
import { authConfigured } from "@/lib/auth-config";
import { foundingPaymentConfigured } from "@/lib/founding";
import { LateralPage } from "@/components/PageTransition";
import { PricingPlanMotion } from "@/components/PricingPlanMotion";

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
        <h1>Start revising. Stay in control.</h1>
        <p className="legal-lede">
          Revise your own course for free. Kelus Plus is planned at $4.99/month.
          {syncReady
            ? " Free sign-in can sync your progress across devices."
            : " Your progress stays on this device."}
        </p>

        <div className="pricing-booklet-stack pricing-grid" role="list">
          <PricingPlanMotion>
            <article className="pricing-offer is-free pricing-plan">
              <div className="pricing-offer-head">
                <div className="pricing-plan-name"><h2 className="kicker">Free</h2><span className="pricing-availability">Available now</span></div>
                <p className="pricing-price">$0<span>/month</span></p>
              </div>
              <p className="pricing-offer-lede">Everything you need to start a real revision session.</p>
              <ul>
                <li>Add a course and exam date</li>
                <li>Follow a plan shaped by your answers</li>
                <li>Recall, apply, and check your work</li>
                <li>No account required</li>
                {syncReady ? <li>Optional free sign-in to sync across devices</li> : <li>Saved on this device</li>}
              </ul>
              <Link className="cta" href="/today">
                Start revising <span aria-hidden="true">→</span>
              </Link>
            </article>
          </PricingPlanMotion>

          <PricingPlanMotion>
            <article className={`pricing-offer is-pass pricing-plan is-founding${paymentReady ? "" : " is-upcoming"}`}>
              <div className="pricing-offer-head">
                <div className="pricing-plan-name"><h2 className="kicker">Kelus Plus</h2><span className="pricing-availability">{paymentReady ? "Available now" : "Coming soon"}</span></div>
                <p className="pricing-price">
                  $4.99<span>/month</span>
                </p>
              </div>
              <p className="pricing-offer-lede">For students who want deeper feedback and more room for their courses.</p>
              <ul>
                <li>Everything in Free{syncReady ? ", including optional sign-in sync" : ""}</li>
                <li>More course space and richer answer feedback</li>
                <li>Priority access to new revision features</li>
                <li>Direct email support while subscribed</li>
                <li>Monthly billing; no annual commitment</li>
              </ul>
              <FoundingCta source="pricing" />
            </article>
          </PricingPlanMotion>
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
