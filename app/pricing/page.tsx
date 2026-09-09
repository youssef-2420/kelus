import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { FoundingCta } from "@/components/FoundingCta";
import { ExamPassRedeem } from "@/components/ExamPassRedeem";
import { PricingViewTracker } from "@/components/PricingViewTracker";
import { authConfigured } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Try today’s route free. $9 Exam Pass maps the remaining days until your exam.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const syncReady = authConfigured();

  return (
    <main id="main" className="legal-page pricing-page">
      <PricingViewTracker />
      <section className="legal-panel">
        <p className="kicker">Pricing</p>
        <h1>Prepare for one exam. Pay for one exam.</h1>
        <p className="legal-lede">
          Today’s revision session is free on this device.
          {syncReady
            ? " Sign in anytime to sync that progress across browsers."
            : " Account sync ships when enabled for your build."}{" "}
          Exam Pass is the remaining-day plan: which topics get a session before the date you set, and which would be left at your daily minutes.
        </p>

        <div className="pricing-grid" role="list">
          <article className="pricing-plan" role="listitem">
            <p className="kicker">Free</p>
            <h2>Today’s route</h2>
            <p className="pricing-price">$0</p>
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

          <article className="pricing-plan is-founding" role="listitem">
            <p className="kicker">Exam Pass</p>
            <h2>The remaining days until your exam</h2>
            <p className="pricing-price">
              $9<span>/exam</span>
            </p>
            <ul>
              <li>Everything in Free{syncReady ? ", including optional sign-in sync" : ""}</li>
              <li>Day-by-day plan from tomorrow through the exam date you set</li>
              <li>Calendar file for those days, plus a printable topic list</li>
              <li>Shows which topics would be left at your daily minutes</li>
              <li>Direct email through exam day if something breaks</li>
            </ul>
            <FoundingCta source="pricing" />
          </article>
        </div>

        <ExamPassRedeem />

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
  );
}
