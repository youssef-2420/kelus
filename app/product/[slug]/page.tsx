import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductIntelligenceView } from "@/app/results-v2/page";
import { ProductSeoIntro } from "@/components/ProductSeoIntro";
import { getProductBySlug, getVariantById, products } from "@/lib/demo-data";
import type { SeoIndexedCondition } from "@/lib/catalog-snapshot-targets";
import { canonicalProductPath, readCanonicalProductSlug } from "@/lib/search-state";
import { absoluteOgImage, formatFromPrice, getCriteriaListingPreview, hasBundledSnapshot } from "@/lib/bundled-snapshot-catalog";
import { resolveInitialProductIntelligence } from "@/services/server-product-intelligence";
import { CONDITIONS } from "@/types/kelus";

type RouteParams = { slug: string };
type PageProps = { params: Promise<RouteParams> };

export const dynamic = "force-dynamic";

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
  const preview = getCriteriaListingPreview(criteria);
  const hasLive = hasBundledSnapshot(criteria) || Boolean(preview?.live);
  const conditionLabel = criteria.condition === "any" ? "any condition" : criteria.condition;
  const priceHint = preview?.fromPrice ? ` from ${formatFromPrice(preview.fromPrice)}` : "";
  const title = `${product.name} ${variant.label}${priceHint} | Kelus`;
  const description = hasLive
    ? `Compare validated eBay offers for ${product.name} ${variant.label} in ${conditionLabel}. Kelus pick, known totals, and seller trust evidence updated when available.`
    : `Check ${product.name} ${variant.label} prices on Kelus. Compare matching eBay offers with known shipping, seller evidence, and return terms when available.`;
  const canonicalUrl = `https://kelus.me${canonicalProductPath(criteria)}`;
  const ogImage = absoluteOgImage();
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl, images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function CanonicalProductPage({ params }: PageProps) {
  const resolved = exactProduct((await params).slug);
  if (!resolved) notFound();
  const { criteria, product, variant } = resolved;
  const initialOutcome = await resolveInitialProductIntelligence(criteria);
  const condition = criteria.condition === "any" ? "Multiple conditions" : `${criteria.condition[0].toUpperCase()}${criteria.condition.slice(1)}`;
  const offers = initialOutcome.status === "SUCCESS" ? initialOutcome.result.offers.filter((offer) => offer.dataSource === "live").slice(0, 5) : [];
  const listingPreview = getCriteriaListingPreview(criteria);
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
    ...(listingPreview?.fromPrice ? {
      offers: {
        "@type": "AggregateOffer",
        lowPrice: listingPreview.fromPrice,
        highPrice: offers.length ? Math.max(...offers.map((offer) => offer.shippingCostKnown === false ? offer.price : offer.price + offer.shippingCost)) : listingPreview.fromPrice,
        priceCurrency: "USD",
        offerCount: listingPreview.offerCount,
        url: `https://kelus.me${canonicalProductPath(criteria)}`,
      },
    } : offers.length ? {
      offers: offers.map((offer) => ({
        "@type": "Offer",
        price: offer.shippingCostKnown === false ? offer.price : Math.round((offer.price + offer.shippingCost) * 100) / 100,
        priceCurrency: offer.currency,
        itemCondition: `https://schema.org/${offer.condition === "new" ? "NewCondition" : offer.condition === "refurbished" ? "RefurbishedCondition" : "UsedCondition"}`,
        url: offer.affiliateUrl ?? `https://kelus.me${canonicalProductPath(criteria)}`,
      })),
    } : {}),
  };
  const seoCondition = criteria.condition === "new" || criteria.condition === "used"
    ? criteria.condition as SeoIndexedCondition
    : "new";
  return <>
    <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>
    <ProductSeoIntro product={product} variant={variant} condition={seoCondition} hasLiveSnapshot={hasBundledSnapshot(criteria) || offers.length > 0}/>
    <ProductIntelligenceView criteria={criteria} initialOutcome={initialOutcome}/>
  </>;
}
