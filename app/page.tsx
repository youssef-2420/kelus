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
      <section className="desk section" aria-label="Search and example Kelus pick">
        <div className="desk-rail">
          <h1>What are you buying?</h1>
          <p>
            Search the exact product and configuration. Kelus compares matching eBay offers with known shipping, then recommends one that clears seller and price checks.
          </p>
          <div id="product-search" className="hero-search-wrap desk-search">
            <SearchControls minimal minimalAction deferProductSelection actionLabel="Search" />
          </div>
          <p className="desk-coverage-hint">Phones, computers, tablets, audio, wearables, and consoles.</p>
          <OnboardingTour />
        </div>
        <ComparisonStage layout="desk" />
      </section>
      <HomeLearnSection />
      <SiteFooter />
    </main>
  );
}
