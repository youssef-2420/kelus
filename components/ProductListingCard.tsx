import { CatalogProductImage } from "@/components/CatalogProductImage";
import { Icon } from "@/components/Icon";
import type { ProductListingPreview } from "@/lib/catalog-preview-types";
import { SafeLink as Link } from "@/components/SafeLink";

type Props = {
  preview: ProductListingPreview;
  compact?: boolean;
  layout?: "row" | "tile";
  showStatus?: boolean;
};

export function ProductListingCard({ preview, compact = false, layout = "row", showStatus = true }: Props) {
  const validated = preview.live && preview.fromPrice > 0;
  const statusLabel = validated
    ? `From ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(preview.fromPrice)}`
    : "View comparison";
  const statusDetail = validated ? "Validated comparison available" : "Indexed — comparison not saved yet";
  const tile = layout === "tile";

  return (
    <Link href={preview.href} className={`product-listing-card${compact ? " is-compact" : ""}${tile ? " is-tile" : ""}`} title={statusDetail}>
      <CatalogProductImage listingImageUrl={preview.listingImageUrl} fallbackLabel={preview.image} className="product-listing-mark" size={tile ? 220 : 120} />
      <span className="product-listing-copy">
        <span className="product-listing-kicker">
          {preview.brand}
          {showStatus ? validated ? <em className="product-listing-live">Validated</em> : <em className="product-listing-indexed">Indexed</em> : null}
        </span>
        <b>{preview.productName}</b>
        <small>{preview.variantLabel} · {preview.condition === "new" ? "New" : preview.condition === "used" ? "Used" : preview.condition}</small>
        <span className={`product-listing-price${validated ? "" : " is-muted"}`}>
          {statusLabel}
          {validated && preview.pickPrice && preview.pickPrice !== preview.fromPrice
            ? ` · Kelus pick ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(preview.pickPrice)}`
            : ""}
        </span>
      </span>
      <Icon name="arrow" size={16} />
    </Link>
  );
}
