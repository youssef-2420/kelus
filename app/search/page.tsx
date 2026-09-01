import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
};

export default function SearchPage() {
  return (
    <main className="search-page">
      <KelusHeader />
      <section className="search-page-hero hero-figma" aria-label="Product search">
        <div id="product-search" className="hero-search-wrap">
          <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
        </div>
        <div className="search-page-intro">
          <p className="eyebrow">Product search</p>
          <h1>Find the offer worth buying.</h1>
          <p>Search exact configurations across phones, laptops, tablets, audio, wearables, and consoles.</p>
        </div>
      </section>
      <p className="search-page-note">
        <Icon name="lock" size={15} />
        Kelus compares exact configuration, known shipping, seller evidence, and price anomalies before recommending an offer.
      </p>
    </main>
  );
}
