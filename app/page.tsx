import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { VerifiedNotice } from "@/components/VerifiedNotice";
import { SearchControls } from "@/components/SearchControls";
import { ComparisonStage } from "@/components/ComparisonStage";
import { HomeLearnSection } from "@/components/HomeLearnSection";
import { HomepageSocialProof } from "@/components/HomepageSocialProof";
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
    <main className="home-page">
      <LandingAnalytics />
      <KelusHeader />
      <VerifiedNotice />
      <OnboardingTour />
      <section className="home-stage section" aria-label="Search Kelus">
        <div className="home-stage-command">
          <div className="home-stage-copy">
            <h1>Find the offer worth buying.</h1>
            <p>
              Kelus compares matching eBay listings for the exact product you want, adds known shipping, and recommends one offer that passes seller and price checks.
            </p>
          </div>
          <div id="product-search" className="hero-search-wrap home-stage-search">
            <SearchControls minimal minimalAction deferProductSelection actionLabel="Search" />
          </div>
          <HomepageSocialProof />
        </div>
        <ComparisonStage />
      </section>
      <HomeLearnSection />
      <SiteFooter />
    </main>
  );
}
