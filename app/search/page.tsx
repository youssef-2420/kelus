import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { getDiscoverableProducts } from "@/lib/demo-data";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";
import { canonicalProductPath } from "@/lib/search-state";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
  alternates: { canonical: "https://kelus.me/search" },
};

export default function SearchPage() {
  const quickStarts = getDiscoverableProducts(8).map((product) => ({
    product,
    href: canonicalProductPath({
      productSlug: product.slug,
      variantId: product.searchAttribute.validVariantIds[0],
      condition: "new",
      market: "us",
    }),
  }));

  return (
    <main className="search-page">
      <KelusHeader />
      <section className="search-page-hero hero-figma" aria-label="Product search">
        <div className="search-page-intro">
          <p className="eyebrow">Product search</p>
          <h1>Find the offer worth buying.</h1>
          <p>Search exact configurations across phones, laptops, tablets, audio, wearables, and consoles.</p>
        </div>
        <div id="product-search" className="hero-search-wrap">
          <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
        </div>
        <section className="search-quick-starts" aria-label="Popular products">
          <p className="eyebrow">Popular right now</p>
          <div>
            {quickStarts.map(({ product, href }) => (
              <Link key={product.slug} href={href}>{product.brand} {product.name}</Link>
            ))}
          </div>
        </section>
        <nav className="search-category-nav" aria-label="Browse by category">
          <p className="eyebrow">Browse by category</p>
          <div>
            {categoryHubs.map((hub) => (
              <Link key={hub.slug} href={categoryHubPath(hub.slug)}>{hub.label}</Link>
            ))}
          </div>
        </nav>
      </section>
      <p className="search-page-note">
        <Icon name="lock" size={15} />
        Kelus compares exact configuration, known shipping, seller evidence, and price anomalies before recommending an offer.
      </p>
    </main>
  );
}
