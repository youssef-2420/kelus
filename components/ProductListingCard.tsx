import { CatalogProductImage } from "@/components/CatalogProductImage";
import { Icon } from "@/components/Icon";
import { formatFromPrice, type ProductListingPreview } from "@/lib/bundled-snapshot-catalog";
import { getProductCardStatus } from "@/lib/catalog-availability";
import { SafeLink as Link } from "@/components/SafeLink";

type Props = {
  preview: ProductListingPreview;
  compact?: boolean;
};

export function ProductListingCard({ preview, compact = false }: Props) {
  const cardStatus = getProductCardStatus(preview.productSlug);
  const validated = cardStatus.status === "validated";

  return (
    <Link href={preview.href} className={`product-listing-card${compact ? " is-compact" : ""}`} title={cardStatus.detail}>
      <CatalogProductImage listingImageUrl={preview.listingImageUrl} fallbackLabel={preview.image} className="product-listing-mark" />
      <span className="product-listing-copy">
        <span className="product-listing-kicker">
          {preview.brand}
          {validated ? <em className="product-listing-live">Validated</em> : <em className="product-listing-indexed">Indexed</em>}
        </span>
        <b>{preview.productName}</b>
        <small>{preview.variantLabel} · {preview.condition === "new" ? "New" : preview.condition === "used" ? "Used" : preview.condition}</small>
        <span className={`product-listing-price${validated ? "" : " is-muted"}`}>
          {cardStatus.label}
          {validated && preview.pickPrice && preview.pickPrice !== preview.fromPrice
            ? ` · Kelus pick ${formatFromPrice(preview.pickPrice)}`
            : ""}
        </span>
      </span>
      <Icon name="arrow" size={16} />
    </Link>
  );
}
