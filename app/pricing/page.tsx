import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { PricingViewTracker } from "@/components/PricingViewTracker";
import { authConfigured } from "@/lib/auth-config";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Try Kelus free, then reserve a $9.99 Exam Pass for launch support through one exam.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const syncReady = authConfigured();

  return (
    <LateralPage>
    <main id="main" className="legal-page pricing-page is-notion-product is-booklet-pricing">
      <PricingViewTracker />
      <section className="legal-panel pricing-booklet">
        <p className="kicker">Pricing</p>
        <h1>Prepare for one exam. Pay for one exam.</h1>
        <p className="legal-lede">
          Revision starts free on this device.
          {syncReady
            ? " Sign in anytime to sync that progress across browsers."
            : " Account sync ships when enabled for your build."}
        </p>

        <div className="pricing-booklet-stack pricing-grid" role="list">
          <article className="pricing-offer is-free pricing-plan" role="listitem">
            <div className="pricing-offer-head">
              <p className="kicker">Free</p>
              <p className="pricing-price">$0</p>
            </div>
            <h2>Try a revision session</h2>
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

          <article className="pricing-offer is-pass pricing-plan is-founding" role="listitem">
            <div className="pricing-offer-head">
              <p className="kicker">Exam Pass</p>
              <p className="pricing-price">
                $9.99<span>/exam</span>
              </p>
            </div>
            <h2>Support through exam day</h2>
            <p className="pricing-offer-lede">
              A one-time launch pass for students who want priority support through the exam date they set.
            </p>
            <ul>
              <li>Everything in Free{syncReady ? ", including optional sign-in sync" : ""}</li>
              <li>Priority access to new study features while Exam Pass launches</li>
              <li>Direct email support through the exam date you set</li>
              <li>Funds improvements to revision and exam practice</li>
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
      <SiteFooter compact />
    </main>
  </LateralPage>
  );
}
