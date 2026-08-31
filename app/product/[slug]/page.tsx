import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductIntelligenceView } from "@/app/results-v2/page";
import { getProductBySlug, getVariantById, products } from "@/lib/demo-data";
import { canonicalProductPath, readCanonicalProductSlug } from "@/lib/search-state";
import { resolveInitialProductIntelligence } from "@/services/server-product-intelligence";
import { CONDITIONS } from "@/types/kelus";

type RouteParams = { slug: string };
type PageProps = { params: Promise<RouteParams> };

export function generateStaticParams(): RouteParams[] {
  return products.flatMap((product) =>
    product.searchAttribute.validVariantIds.flatMap((variantId) =>
      CONDITIONS.map((condition) => ({ slug: `${variantId}-${condition}` })),
    ),
  );
}

function exactProduct(slug: string) {
  const criteria = readCanonicalProductSlug(slug);
  if (!criteria) return null;
  const product = getProductBySlug(criteria.productSlug);
  const variant = getVariantById(criteria.variantId);
  return product && variant ? { criteria, product, variant } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = exactProduct((await params).slug);
  if (!resolved) return { title: "Product not found | Kelus", robots: { index: false, follow: false } };
  const { criteria, product, variant } = resolved;
  const condition = criteria.condition === "any" ? "all conditions" : criteria.condition;
  const title = `${product.name} ${variant.label} prices | Kelus`;
  const description = `Compare matching live eBay offers for ${product.name} ${variant.label} in ${condition}. See Kelus's current pick and real price context when available.`;
  const canonicalUrl = `https://kelus.me${canonicalProductPath(criteria)}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl, images: [] },
    twitter: { card: "summary", title, description, images: [] },
  };
}

export default async function CanonicalProductPage({ params }: PageProps) {
  const resolved = exactProduct((await params).slug);
  if (!resolved) notFound();
  const { criteria, product, variant } = resolved;
  const initialOutcome = await resolveInitialProductIntelligence(criteria);
  const condition = criteria.condition === "any" ? "Multiple conditions" : `${criteria.condition[0].toUpperCase()}${criteria.condition.slice(1)}`;
  const offers = initialOutcome.status === "SUCCESS" ? initialOutcome.result.offers.filter((offer) => offer.dataSource === "live").slice(0, 5) : [];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${variant.label}`,
    brand: { "@type": "Brand", name: product.brand },
    model: product.name,
    category: product.category,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Configuration", value: variant.label },
      { "@type": "PropertyValue", name: "Condition filter", value: condition },
    ],
    url: `https://kelus.me${canonicalProductPath(criteria)}`,
    ...(offers.length ? {
      offers: offers.map((offer) => ({
        "@type": "Offer",
        price: offer.shippingCostKnown === false ? offer.price : Math.round((offer.price + offer.shippingCost) * 100) / 100,
        priceCurrency: offer.currency,
        itemCondition: `https://schema.org/${offer.condition === "new" ? "NewCondition" : offer.condition === "refurbished" ? "RefurbishedCondition" : "UsedCondition"}`,
        url: offer.affiliateUrl ?? `https://kelus.me${canonicalProductPath(criteria)}`,
      })),
    } : {}),
  };
  return <>
    <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>
    <ProductIntelligenceView criteria={criteria} initialOutcome={initialOutcome}/>
  </>;
}
