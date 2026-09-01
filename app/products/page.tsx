import type { Metadata } from "next";
import { KelusHeader } from "@/components/KelusHeader";
import { ProductsDirectory } from "@/components/ProductsDirectory";
import { SiteFooter } from "@/components/SiteFooter";
import { CatalogAvailabilityLegend } from "@/components/CatalogAvailabilityLegend";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { productCategories } from "@/lib/demo-data";
import { listProductListingPreviews } from "@/lib/bundled-snapshot-catalog";

export const metadata: Metadata = {
  title: "All supported products — Kelus price comparisons",
  description: "Browse every phone, laptop, tablet, wearable, audio product, and console Kelus compares on eBay with validated offers and Kelus picks.",
  alternates: { canonical: "https://kelus.me/products" },
  openGraph: {
    title: "All supported products — Kelus",
    description: "Browse validated eBay price comparisons across Kelus-supported electronics.",
    url: "https://kelus.me/products",
    type: "website",
    images: ["/og.png"],
  },
};

export default function ProductsPage() {
  const previews = listProductListingPreviews();
  const liveCount = previews.filter((preview) => preview.live).length;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Kelus supported products",
    url: "https://kelus.me/products",
    description: "Browse electronics Kelus compares with validated eBay offers.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: previews.length,
      itemListElement: previews.map((preview, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${preview.brand} ${preview.productName}`,
        url: `https://kelus.me${preview.href}`,
      })),
    },
  };

  return (
    <main className="products-page">
      <KelusHeader />
      <section className="products-directory section">
        <p className="eyebrow">Product directory</p>
        <h1>Every product Kelus compares</h1>
        <p className="products-directory-lead">
          {liveCount > 0
            ? `${liveCount} of ${previews.length} products have validated comparisons right now. Open any listing to see Kelus picks, seller evidence, and known totals.`
            : "Browse supported configurations across phones, laptops, tablets, wearables, audio, and consoles."}
        </p>
        <div className="products-directory-actions">
          <Link className="button button-primary" href="/search">Search products <Icon name="arrow" size={17} /></Link>
          <Link className="text-link" href="/coverage">Coverage overview <Icon name="arrow" size={15} /></Link>
        </div>
        <CatalogAvailabilityLegend />
        <ProductsDirectory previews={previews} categories={productCategories} />
      </section>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
