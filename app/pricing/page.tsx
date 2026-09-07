import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { PricingViewTracker } from "@/components/PricingViewTracker";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Try Kelus free, then reserve a $9 Exam Pass for launch support through one exam.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <main id="main" className="legal-page pricing-page">
      <PricingViewTracker />
      <section className="legal-panel">
        <p className="kicker">Pricing</p>
        <h1>Prepare for one exam. Pay for one exam.</h1>
        <p className="legal-lede">
          Build your first route free on this device. Sign in anytime to sync that progress across browsers. The Exam
          Pass is a one-time $9 launch pass for students who want priority support through exam day.
        </p>

        <div className="pricing-grid" role="list">
          <article className="pricing-plan" role="listitem">
            <p className="kicker">Free</p>
            <h2>Try a real route</h2>
            <p className="pricing-price">$0</p>
            <ul>
              <li>Add your course and exam date</li>
              <li>Build today’s evidence-based route</li>
              <li>Complete a diagnosis and study session</li>
              <li>No account required</li>
              <li>Optional free sign-in to sync across devices</li>
            </ul>
            <Link className="cta" href="/today">
              Build today’s route <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="pricing-plan is-founding" role="listitem">
            <p className="kicker">Exam Pass</p>
            <h2>Support through exam day</h2>
            <p className="pricing-price">
              $9<span>/exam</span>
            </p>
            <ul>
              <li>Everything in Free, including optional sign-in sync</li>
              <li>Priority access to new study features while Exam Pass launches</li>
              <li>Direct email support through the exam date you set</li>
              <li>Funds focused work on the adaptive route</li>
            </ul>
            <FoundingCta source="pricing" />
          </article>
        </div>

        <p className="legal-inline-links">
          Questions? <a href="mailto:hello@kelus.me">hello@kelus.me</a>
          {" · "}
          <Link href="/privacy">Privacy</Link>
        </p>
      </section>
      <SiteFooter compact />
    </main>
  );
}
