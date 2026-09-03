import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { LandingAnalytics } from "@/components/LandingAnalytics";
import { VerifiedNotice } from "@/components/VerifiedNotice";
import { SearchControls } from "@/components/SearchControls";
import { SearchSetupButton } from "@/components/SearchSetupButton";
import { HomeDeskPass } from "@/components/HomeDeskPass";
import { ComparisonStage } from "@/components/ComparisonStage";
import { HomeLearnSection } from "@/components/HomeLearnSection";
import { SiteFooter } from "@/components/SiteFooter";
import { getComparisonDemo } from "@/lib/bundled-snapshot-catalog";

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
  const demo = getComparisonDemo();
  return (
    <main id="main-content" className="home-page home-desk">
      <LandingAnalytics />
      <KelusHeader />
      <VerifiedNotice />
      <section className="desk section" aria-label="Search and example Kelus pick">
        <div className="desk-rail">
          <h1>What are you buying?</h1>
          <p>
            Search the exact setup. Kelus compares matching eBay listings with known totals, then shows which offer cleared the checks — not just the lowest price.
          </p>
          <div id="product-search" className="hero-search-wrap desk-search">
            <SearchControls minimal minimalAction deferProductSelection actionLabel="Search" />
          </div>
          {demo ? (
            <SearchSetupButton
              productName={demo.productName}
              productSlug={demo.productSlug}
              variantId={demo.variantId}
              condition={demo.condition}
            />
          ) : null}
          <HomeDeskPass />
        </div>
        <ComparisonStage layout="desk" />
      </section>
      <HomeLearnSection />
      <SiteFooter />
    </main>
  );
}
