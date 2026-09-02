import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { SearchControls } from "@/components/SearchControls";
import { SearchPickPreview } from "@/components/SearchPickPreview";
import { SiteFooter } from "@/components/SiteFooter";
import { SafeLink as Link } from "@/components/SafeLink";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";
import { getSearchQuickStarts } from "@/lib/search-quick-starts";
import { formatFromPrice } from "@/lib/bundled-snapshot-catalog";
import { getProductCardStatus } from "@/lib/catalog-availability";

export const metadata: Metadata = {
  title: "Search — Kelus",
  description: "Search supported electronics and compare validated eBay offers for the exact product, configuration, and condition you want.",
  alternates: { canonical: "https://kelus.me/search" },
};

export default function SearchPage() {
  const quickStarts = getSearchQuickStarts(8);

  return (
    <main className="search-page">
      <KelusHeader shell="search" />
      <section className="search-page-shell section" aria-label="Product search">
        <div className="search-workbench">
          <div className="search-workbench-main">
            <header className="search-page-intro">
              <h1>What are you shopping for?</h1>
              <p>Pick the exact product, storage, and condition. Kelus compares validated eBay offers and recommends one worth buying.</p>
            </header>
            <div id="product-search" className="hero-search-wrap search-page-search">
              <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
            </div>
            <section className="search-quick-starts" aria-labelledby="search-popular-heading">
              <h2 id="search-popular-heading" className="search-section-heading">Popular right now</h2>
              <ul className="search-quick-list">
                {quickStarts.map(({ product, href, fromPrice, live }) => {
                  const status = live && fromPrice
                    ? { label: `From ${formatFromPrice(fromPrice)}`, detail: "Validated comparison available" }
                    : getProductCardStatus(product.slug);
                  return (
                    <li key={`${product.slug}-${href}`}>
                      <Link className="search-quick-row" href={href} title={status.detail}>
                        <span className="search-quick-row-copy">
                          <strong>{product.brand} {product.name}</strong>
                          <small>{status.label}</small>
                        </span>
                        <Icon name="arrow" size={14} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            <nav className="search-category-nav" aria-labelledby="search-category-heading">
              <h2 id="search-category-heading" className="search-section-heading">Browse by category</h2>
              <div className="search-category-grid">
                {categoryHubs.map((hub) => (
                  <Link key={hub.slug} href={categoryHubPath(hub.slug)}>{hub.label}</Link>
                ))}
              </div>
            </nav>
          </div>
          <SearchPickPreview />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
