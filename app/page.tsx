import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { VerifiedNotice } from "@/components/VerifiedNotice";
import { SearchControls } from "@/components/SearchControls";
import { HomeTrustStrip } from "@/components/HomeTrustStrip";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SiteFooter } from "@/components/SiteFooter";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";

export const metadata: Metadata = {
  title: "Kelus — Find the offer worth buying",
  description: "Search popular electronics and see which validated eBay offer Kelus recommends after checking exact configuration, known shipping, seller evidence, returns, and price anomalies.",
};

export default function Home() {
  return (
    <main className="home-page">
      <LandingAnalytics />
      <KelusHeader />
      <VerifiedNotice />
      <OnboardingTour />
      <section className="home-hero section" aria-label="Search Kelus">
        <div className="home-hero-copy">
          <h1>Shop smarter.<br />Know before you buy.</h1>
          <p className="home-hero-lead">
            A cheaper listing can still lose when shipping raises the total, the configuration is wrong, or seller evidence is weak. Kelus checks before it recommends.
          </p>
        </div>
        <div id="product-search" className="hero-search-wrap">
          <SearchControls minimal minimalAction deferProductSelection actionLabel="Search" />
        </div>
        <HomeTrustStrip />
      </section>
      <section className="home-learn section" aria-label="Learn about Kelus">
        <Link className="home-learn-card" href="/how-it-works">
          <Icon name="grid" size={20} />
          <span>
            <strong>How Kelus works</strong>
            <small>From search to a clear comparison</small>
          </span>
          <Icon name="arrow" size={15} />
        </Link>
        <Link className="home-learn-card" href="/methodology">
          <Icon name="shield" size={20} />
          <span>
            <strong>How Kelus picks</strong>
            <small>Evidence behind every recommendation</small>
          </span>
          <Icon name="arrow" size={15} />
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
