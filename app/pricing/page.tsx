import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { PricingViewTracker } from "@/components/PricingViewTracker";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Kelus is free for local exam planning. Founding student unlocks sync and multi-course when billing opens.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <main id="main" className="legal-page pricing-page">
      <PricingViewTracker />
      <section className="legal-panel">
        <p className="kicker">Pricing</p>
        <h1>Start free. Join founding when you want sync.</h1>
        <p className="legal-lede">
          Kelus already plans today’s route on this device. Founding student is for people who want the next layer —
          sync, multi-course, and priority access — without paying until billing is live.
        </p>

        <div className="pricing-grid" role="list">
          <article className="pricing-plan" role="listitem">
            <p className="kicker">Free</p>
            <h2>Local planner</h2>
            <p className="pricing-price">$0</p>
            <ul>
              <li>Upload course PDFs on this device</li>
              <li>Confirm concepts and build today’s route</li>
              <li>Diagnosis + study sessions</li>
              <li>No account required</li>
            </ul>
            <Link className="cta" href="/today">
              Build today’s route <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="pricing-plan is-founding" role="listitem">
            <p className="kicker">Founding student</p>
            <h2>Sync when it’s ready</h2>
            <p className="pricing-price">
              $9<span>/term</span>
            </p>
            <ul>
              <li>Everything in Free</li>
              <li>Cross-device sync (when billing opens)</li>
              <li>Multi-course workspace</li>
              <li>Priority access to new study features</li>
            </ul>
            <WaitlistForm source="pricing" compact />
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
