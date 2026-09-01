import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { LiveShowcase } from "@/components/LiveShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";
import { getSearchQuickStarts } from "@/lib/search-quick-starts";
import { formatFromPrice } from "@/lib/bundled-snapshot-catalog";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
  alternates: { canonical: "https://kelus.me/search" },
};

export default function SearchPage() {
  const quickStarts = getSearchQuickStarts(8);

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
            {quickStarts.map(({ product, href, fromPrice, live }) => (
              <Link key={`${product.slug}-${href}`} href={href}>
                {product.brand} {product.name}
                {live && fromPrice ? <em>From {formatFromPrice(fromPrice)}</em> : <em>Check availability</em>}
              </Link>
            ))}
          </div>
        </section>
        <LiveShowcase compact />
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
      <SiteFooter />
    </main>
  );
}
