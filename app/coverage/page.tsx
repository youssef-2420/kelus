import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { categoryHubs } from "@/lib/category-routes";
import { countLiveCatalogProducts, formatFromPrice, getProductListingPreview } from "@/lib/bundled-snapshot-catalog";
import { products } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "What Kelus covers — supported products",
  description: "Browse the electronics Kelus compares on eBay: phones, laptops, tablets, audio, wearables, and consoles with validated offer comparisons.",
  alternates: { canonical: "https://kelus.me/coverage" },
};

export default function CoveragePage() {
  const liveProducts = countLiveCatalogProducts();
  const sorted = [...products].sort((left, right) => left.brand.localeCompare(right.brand) || left.name.localeCompare(right.name));

  return (
    <main className="app-page">
      <KelusHeader />
      <section className="coverage-page">
        <p className="eyebrow">Catalog</p>
        <h1>What Kelus covers</h1>
        <p className="coverage-lead">
          Kelus compares matching eBay listings for exact product configurations. Coverage grows as Kelus validates more live offers — not every variant is available yet.
        </p>
        <div className="coverage-stats">
          <div className="coverage-stat">
            <b>{products.length}</b>
            <span>Products indexed</span>
          </div>
          <div className="coverage-stat">
            <b>{liveProducts}</b>
            <span>With saved comparisons</span>
          </div>
          <div className="coverage-stat">
            <b>{categoryHubs.length}</b>
            <span>Category hubs</span>
          </div>
        </div>
        <div className="coverage-grid">
          {sorted.map((product) => {
            const preview = getProductListingPreview(product.slug);
            const href = preview?.href ?? `/product/${product.slug}`;
            return (
              <Link key={product.slug} href={href} className="coverage-card">
                <span className="coverage-card-mark" aria-hidden="true">{product.image}</span>
                <span className="coverage-card-copy">
                  <b>{product.name}</b>
                  <small>{product.brand} · {product.category}</small>
                  {preview?.live && preview.fromPrice
                    ? <em>From {formatFromPrice(preview.fromPrice)}</em>
                    : <em>Check availability</em>}
                </span>
                <Icon name="arrow" size={16} />
              </Link>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
