import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KelusHeader } from "@/components/KelusHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Icon } from "@/components/Icon";
import { SafeLink as Link } from "@/components/SafeLink";
import { categoryHubPath, categoryHubs, getCategoryHub, getCategoryHubProducts } from "@/lib/category-routes";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { getProductCardStatus } from "@/lib/catalog-availability";
import { canonicalProductPath } from "@/lib/search-state";
import { absoluteCanonicalUrl } from "@/lib/seo-url";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categoryHubs.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const hub = getCategoryHub((await params).slug);
  if (!hub) return { title: "Category not found | Kelus", robots: { index: false, follow: false } };
  const title = `${hub.label} price comparisons | Kelus`;
  const description = hub.description;
  const canonicalUrl = absoluteCanonicalUrl(categoryHubPath(hub.slug));
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl },
  };
}

export default async function CategoryHubPage({ params }: PageProps) {
  const hub = getCategoryHub((await params).slug);
  if (!hub) notFound();
  const products = getCategoryHubProducts(hub.slug);
  const canonicalUrl = absoluteCanonicalUrl(categoryHubPath(hub.slug));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${hub.label} price comparisons`,
    description: hub.description,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${product.brand} ${product.name}`,
        url: absoluteCanonicalUrl(canonicalProductPath({
          productSlug: product.slug,
          variantId: product.searchAttribute.validVariantIds[0],
          condition: "new",
          market: "us",
        })),
      })),
    },
  };

  return (
    <main className="category-hub-page">
      <KelusHeader />
      <section className="category-hub section">
        <p className="eyebrow">Browse {hub.label.toLowerCase()}</p>
        <h1>{hub.label} worth buying on eBay</h1>
        <p className="category-hub-lead">{hub.description}</p>
        <div className="category-hub-actions">
          <Link className="button button-primary" href="/search">Search {hub.label.toLowerCase()} <Icon name="arrow" size={17} /></Link>
          <Link className="text-link" href="/methodology">How Kelus validates offers <Icon name="arrow" size={15} /></Link>
        </div>
        <div className="category-hub-grid">
          {products.map((product) => {
            const status = getProductCardStatus(product.slug);
            return (
              <Link key={product.slug} href={status.href} className="category-hub-card" title={status.detail}>
                <CatalogProductImage listingImageUrl={status.listingImageUrl} fallbackLabel={status.imageLabel} className="category-hub-card-mark" />
                <span className="category-hub-card-copy">
                  <b>{product.name}</b>
                  <small>{product.brand}</small>
                  <em className={status.status === "validated" ? "is-validated" : "is-indexed"}>{status.label}</em>
                </span>
                <Icon name="arrow" size={16} />
              </Link>
            );
          })}
        </div>
      </section>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
