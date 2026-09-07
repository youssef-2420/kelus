import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { PricingViewTracker } from "@/components/PricingViewTracker";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Try Kelus free, then reserve a $19 Exam Pass for one focused adaptive route through exam day.",
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
          Build your first route free. The Exam Pass is a focused, one-time upgrade for students who want their
          course, learning evidence, and changing route kept together through exam day.
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
            </ul>
            <Link className="cta" href="/today">
              Build today’s route <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="pricing-plan is-founding" role="listitem">
            <p className="kicker">Exam Pass</p>
            <h2>Stay routed to exam day</h2>
            <p className="pricing-price">
              $19<span>/exam</span>
            </p>
            <ul>
              <li>Everything in Free</li>
              <li>One course routed through one exam date</li>
              <li>Cross-device course and learning-state sync</li>
              <li>Priority access while the Exam Pass launches</li>
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
