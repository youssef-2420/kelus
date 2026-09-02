import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { VerifiedNotice } from "@/components/VerifiedNotice";
import { SearchControls } from "@/components/SearchControls";
import { ComparisonStage } from "@/components/ComparisonStage";
import { HomeLearnSection } from "@/components/HomeLearnSection";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Kelus — Find the offer worth buying",
  description: "Search popular electronics and see which validated eBay offer Kelus recommends after checking exact configuration, known shipping, seller evidence, returns, and price anomalies.",
  alternates: { canonical: "https://kelus.me/" },
  openGraph: {
    title: "Kelus — Find the offer worth buying",
    description: "Search popular electronics and see which validated eBay offer is worth buying.",
    url: "https://kelus.me/",
    type: "website",
    images: ["/og.png"],
  },
};

export default function Home() {
  return (
    <main id="main-content" className="home-page home-desk">
      <LandingAnalytics />
      <KelusHeader />
      <VerifiedNotice />
      <OnboardingTour />
      <section className="desk section" aria-label="Search and live Kelus pick">
        <div className="desk-rail">
          <p className="desk-kicker">Price is only the first filter</p>
          <h1>Find the offer worth buying.</h1>
          <p>
            A cheap listing can still lose after shipping, weak seller evidence, or a suspicious price. Search once. Kelus checks the rest.
          </p>
          <div id="product-search" className="hero-search-wrap desk-search">
            <SearchControls minimal minimalAction deferProductSelection actionLabel="Search" />
          </div>
        </div>
        <ComparisonStage layout="desk" />
      </section>
      <HomeLearnSection />
      <SiteFooter />
    </main>
  );
}
