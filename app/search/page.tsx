import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
  alternates: { canonical: "https://kelus.me/search" },
};

export default function SearchPage() {
  return (
    <main id="main-content" className="search-page search-desk">
      <KelusHeader activeHref="/search" />
      <section className="search-console section" aria-label="Product search">
        <header className="search-console-copy">
          <h1>Find the exact product</h1>
          <p>Search a model, then choose the setup you want.</p>
        </header>
        <div className="search-console-panel">
          <div id="product-search" className="hero-search-wrap search-console-bar">
            <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
