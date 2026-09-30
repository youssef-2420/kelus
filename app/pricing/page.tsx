import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingViewTracker } from "@/components/PricingViewTracker";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Pricing — Kelus",
  description: "Choose the plan that fits your workflow.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <LateralPage>
      <div data-marketing="editorial" className="legal-page pricing-page is-booklet-product is-booklet-pricing">
        <main id="main">
          <PricingViewTracker />
          <section className="legal-panel pricing-booklet">
            <div className="pricing-header">
              <h1>Get more views, with less effort</h1>
              <div className="pricing-toggle" aria-label="Billing period selector">
                <button type="button" className="pricing-toggle-option is-active">Monthly</button>
                <button type="button" className="pricing-toggle-option" aria-label="Annual billing">
                  Annual <span>Save 50%</span>
                </button>
              </div>
            </div>

            <div className="pricing-booklet-stack pricing-grid" role="list" aria-label="Pricing plans">
              <article className="pricing-offer pricing-plan is-free" role="listitem">
                <div className="pricing-plan-header">
                  <p className="pricing-plan-name">Free</p>
                </div>
                <div className="pricing-price-row">
                  <p className="pricing-price">$0<span>/mo</span></p>
                </div>
                <p className="pricing-description">Try it out for free, no commitments.</p>

                <ul className="pricing-features">
                  <li>10 video exports/mo</li>
                  <li>Guided AI editing</li>
                  <li>You approve most actions</li>
                  <li>Captions</li>
                  <li>Animated titles</li>
                  <li>Automatic split-screen insertions</li>
                  <li>Basic b-roll insertions</li>
                  <li>5 motion graphic insertions/day</li>
                </ul>

                <Link className="cta pricing-cta" href="/today">
                  <span aria-hidden="true">↗</span> Try it
                </Link>
              </article>

              <article className="pricing-offer pricing-plan is-featured" role="listitem">
                <div className="pricing-featured-badge">MOST POPULAR</div>
                <div className="pricing-plan-header">
                  <p className="pricing-plan-name">Creator</p>
                  <span className="pricing-tag">Save 50%</span>
                </div>
                <div className="pricing-price-row">
                  <p className="pricing-price">$12.50<span>/mo</span></p>
                </div>
                <p className="pricing-billed">$150 billed annually</p>
                <p className="pricing-description is-centered">If you want to make videos and edit faster.</p>

                <ul className="pricing-features">
                  <li>30 video exports/mo</li>
                  <li>Autonomous AI editing</li>
                  <li>Agent makes smart decisions for you</li>
                  <li>Captions</li>
                  <li>Animated titles</li>
                  <li>Auto split-screen insertions</li>
                  <li>Auto B-roll insertions</li>
                  <li>Unlimited motion graphics</li>
                </ul>

                <Link className="cta pricing-cta is-primary" href="/today">
                  <span aria-hidden="true">↗</span> Get started
                </Link>
              </article>

              <article className="pricing-offer pricing-plan is-pro" role="listitem">
                <div className="pricing-plan-header">
                  <p className="pricing-plan-name">Pro</p>
                  <span className="pricing-tag is-green">Save 50%</span>
                </div>
                <div className="pricing-price-row">
                  <p className="pricing-price">$30<span>/mo</span></p>
                </div>
                <p className="pricing-billed">$360 billed annually</p>
                <p className="pricing-description is-centered">If you want to make daily videos with advanced insertions.</p>

                <ul className="pricing-features">
                  <li>150 video exports/mo</li>
                  <li>Autonomous AI editing</li>
                  <li>Agent makes smart decisions for you</li>
                  <li>Context-aware captions</li>
                  <li>Animated titles</li>
                  <li>Auto split-screen insertions</li>
                  <li>Auto B-roll insertions</li>
                  <li>Unlimited motion graphics</li>
                  <li>Access to advanced models</li>
                  <li>Open your full edit in Pr &amp; DaVinci</li>
                </ul>

                <Link className="cta pricing-cta is-primary" href="/today">
                  <span aria-hidden="true">↗</span> Get started
                </Link>
              </article>
            </div>
          </section>
        </main>
        <SiteFooter compact />
      </div>
    </LateralPage>
  );
}
