import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ProductIntelligenceView } from "@/app/results-v2/page";
import { getProductBySlug, getVariantById, products } from "@/lib/demo-data";
import { getCriteriaListingPreview, rankAlternativeCriteria } from "@/lib/catalog-availability";
import { canonicalProductPath, readCanonicalProductSlug } from "@/lib/search-state";
import { getAlternativeProductCriteria } from "@/lib/search-state";
import { shouldRedirectToValidatedAlternative } from "@/lib/preferred-product-criteria";
import { hasComparableOffers, productSeoName } from "@/lib/product-seo";
import { absoluteCanonicalUrl } from "@/lib/seo-url";
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

const resolveProductPage = cache(async (slug: string) => {
  const resolved = exactProduct(slug);
  if (!resolved) return null;
  return {
    ...resolved,
    initialOutcome: await resolveInitialProductIntelligence(resolved.criteria),
  };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await resolveProductPage((await params).slug);
  if (!resolved) return { title: "Product not found | Kelus", robots: { index: false, follow: false } };
  const { criteria, product, variant, initialOutcome } = resolved;
  const conditionLabel = criteria.condition === "any" ? "All conditions" : `${criteria.condition[0].toUpperCase()}${criteria.condition.slice(1)}`;
  const preview = getCriteriaListingPreview(criteria);
  const savedPrice = preview.live && preview.fromPrice
    ? ` Saved validated prices start at ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(preview.fromPrice)}.`
    : "";
  const seoName = productSeoName(product);
  const brandedTitle = `${seoName} ${variant.label} ${conditionLabel} price | Kelus`;
  const title = brandedTitle.length <= 60 ? brandedTitle : brandedTitle.replace(" | Kelus", "");
  const baseDescription = `Compare ${seoName} ${variant.label} ${conditionLabel.toLowerCase()} eBay offers by known total and seller evidence. See Kelus's current pick.`;
  const description = `${baseDescription}${savedPrice}`.length <= 160 ? `${baseDescription}${savedPrice}` : baseDescription;
  const canonicalUrl = absoluteCanonicalUrl(canonicalProductPath(criteria));
  const indexable = hasComparableOffers(initialOutcome);
  return {
    title,
    description,
    robots: { index: indexable, follow: true },
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, type: "website", url: canonicalUrl, images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function CanonicalProductPage({ params }: PageProps) {
  const resolved = await resolveProductPage((await params).slug);
  if (!resolved) notFound();
  const { criteria, product, variant, initialOutcome } = resolved;
  const alternatives = rankAlternativeCriteria(criteria, getAlternativeProductCriteria(criteria))
    .map((alternativeCriteria) => ({
      criteria: alternativeCriteria,
      preview: getCriteriaListingPreview(alternativeCriteria),
    }));
  const hasLiveOffers = hasComparableOffers(initialOutcome);
  const redirectCriteria = shouldRedirectToValidatedAlternative(criteria, hasLiveOffers);
  if (redirectCriteria) redirect(canonicalProductPath(redirectCriteria));
  const condition = criteria.condition === "any" ? "Multiple conditions" : `${criteria.condition[0].toUpperCase()}${criteria.condition.slice(1)}`;
  const offers = initialOutcome.status === "SUCCESS" ? initialOutcome.result.offers.filter((offer) => offer.dataSource === "live").slice(0, 5) : [];
  const canonicalUrl = absoluteCanonicalUrl(canonicalProductPath(criteria));
  const productName = `${productSeoName(product)} ${variant.label}`;
  const productImage = offers.find((offer) => offer.imageUrl)?.imageUrl;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteCanonicalUrl() },
          { "@type": "ListItem", position: 2, name: "Products", item: absoluteCanonicalUrl("/products") },
          { "@type": "ListItem", position: 3, name: productName, item: canonicalUrl },
        ],
      },
      {
        "@type": "Product",
        name: productName,
        description: `Kelus comparison of matching ${condition.toLowerCase()} eBay offers for ${productName}, using known total price and available seller evidence.`,
        brand: { "@type": "Brand", name: product.brand },
        model: product.name,
        sku: criteria.variantId,
        category: product.category,
        ...(productImage ? { image: productImage } : {}),
        additionalProperty: [
          { "@type": "PropertyValue", name: "Configuration", value: variant.label },
          { "@type": "PropertyValue", name: "Condition filter", value: condition },
        ],
        url: canonicalUrl,
        ...(offers.length ? {
          offers: offers.map((offer) => ({
            "@type": "Offer",
            price: offer.shippingCostKnown === false ? offer.price : Math.round((offer.price + offer.shippingCost) * 100) / 100,
            priceCurrency: offer.currency,
            itemCondition: `https://schema.org/${offer.condition === "new" ? "NewCondition" : offer.condition === "refurbished" ? "RefurbishedCondition" : "UsedCondition"}`,
            url: offer.affiliateUrl ?? canonicalUrl,
          })),
        } : {}),
      },
    ],
  };
  return <>
    <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>
    <ProductIntelligenceView criteria={criteria} initialOutcome={initialOutcome} alternatives={alternatives}/>
  </>;
}
