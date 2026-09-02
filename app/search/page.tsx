import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { SearchControls } from "@/components/SearchControls";
import { ComparisonStage } from "@/components/ComparisonStage";
import { SiteFooter } from "@/components/SiteFooter";
import { SafeLink as Link } from "@/components/SafeLink";
import { categoryHubPath, categoryHubs } from "@/lib/category-routes";
import { getSearchQuickStarts, formatQuickStartLabel } from "@/lib/search-quick-starts";
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
      <section className="search-stage section" aria-label="Product search">
        <header className="search-stage-intro">
          <h1>Search supported electronics</h1>
          <p>Choose the exact configuration and condition. Kelus validates matching eBay offers and recommends one worth buying.</p>
        </header>
        <div id="product-search" className="hero-search-wrap search-stage-search">
          <SearchControls minimal minimalAction deferProductSelection focusOnMount actionLabel="Search" />
        </div>
        <div className="search-stage-body">
          <div className="search-stage-index">
            <section className="search-index-block" aria-labelledby="search-popular-heading">
              <h2 id="search-popular-heading">Popular right now</h2>
              <ul className="search-index-list">
                {quickStarts.map((item) => {
                  const { product, href, fromPrice, live, variantLabel, condition } = item;
                  const status = live && fromPrice
                    ? { label: `From ${formatFromPrice(fromPrice)}`, detail: "Validated comparison available" }
                    : getProductCardStatus(product.slug);
                  return (
                    <li key={`${product.slug}-${href}`}>
                      <Link className="search-index-row" href={href} title={status.detail}>
                        <span>{formatQuickStartLabel(item)}</span>
                        <span>{status.label}</span>
                        <Icon name="arrow" size={14} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
            <nav className="search-index-block" aria-labelledby="search-category-heading">
              <h2 id="search-category-heading">Categories</h2>
              <p className="search-category-line">
                {categoryHubs.map((hub, index) => (
                  <span key={hub.slug}>
                    {index > 0 ? <span className="search-category-sep" aria-hidden="true">·</span> : null}
                    <Link href={categoryHubPath(hub.slug)}>{hub.label}</Link>
                  </span>
                ))}
              </p>
            </nav>
          </div>
          <ComparisonStage compact />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
