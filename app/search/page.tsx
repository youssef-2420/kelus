import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { ProductListingCard } from "@/components/ProductListingCard";
import { ComparisonStage } from "@/components/ComparisonStage";
import { SiteFooter } from "@/components/SiteFooter";
import { SafeLink as Link } from "@/components/SafeLink";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";
import { listProductListingPreviews } from "@/lib/bundled-snapshot-catalog";
import { getProductCardStatus } from "@/lib/catalog-availability";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
  alternates: { canonical: "https://kelus.me/search" },
};

export default function SearchPage() {
  const previews = listProductListingPreviews()
    .map((preview) => ({ preview, status: getProductCardStatus(preview.productSlug) }))
    .sort((left, right) => {
      const leftLive = left.status.status === "validated" ? 1 : 0;
      const rightLive = right.status.status === "validated" ? 1 : 0;
      if (leftLive !== rightLive) return rightLive - leftLive;
      return (right.preview.fromPrice ?? 0) - (left.preview.fromPrice ?? 0);
    })
    .slice(0, 8)
    .map((entry) => entry.preview);

  return (
    <main id="main-content" className="search-page search-desk">
      <KelusHeader activeHref="/search" />
      <section className="search-console section" aria-label="Product search">
        <header className="search-console-copy">
          <p className="search-console-kicker">Catalog search</p>
          <h1>Find the exact product</h1>
          <p>Search a supported model, choose the configuration, then open a comparison with known totals and one validated pick.</p>
        </header>
        <div className="search-console-panel">
          <div id="product-search" className="hero-search-wrap search-console-bar">
            <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
          </div>
          <nav className="search-console-categories" aria-label="Categories">
            <span className="search-console-categories-label">Browse</span>
            {categoryHubs.map((hub) => (
              <Link key={hub.slug} href={categoryHubPath(hub.slug)}>{hub.label}</Link>
            ))}
          </nav>
        </div>
      </section>
      <section className="search-featured section" aria-label="Example comparison">
        <ComparisonStage compact />
      </section>
      <section className="search-browse section" aria-labelledby="search-browse-heading">
        <div className="search-browse-head">
          <h2 id="search-browse-heading">Popular comparisons</h2>
          <p>Open a product to see the current pick, known totals, and why cheaper listings were passed over.</p>
        </div>
        <div className="search-browse-grid">
          {previews.map((preview) => (
            <ProductListingCard key={`${preview.productSlug}-${preview.href}`} preview={preview} layout="tile" />
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
