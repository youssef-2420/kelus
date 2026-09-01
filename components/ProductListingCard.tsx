import { Icon } from "@/components/Icon";
import { formatFromPrice, type ProductListingPreview } from "@/lib/bundled-snapshot-catalog";
import { SafeLink as Link } from "@/components/SafeLink";

type Props = {
  preview: ProductListingPreview;
  mark?: string;
  compact?: boolean;
};

export function ProductListingCard({ preview, mark, compact = false }: Props) {
  return (
    <Link href={preview.href} className={`product-listing-card${compact ? " is-compact" : ""}`}>
      {mark ? <span className="product-listing-mark" aria-hidden="true">{mark}</span> : null}
      <span className="product-listing-copy">
        <span className="product-listing-kicker">
          {preview.brand}
          {preview.live ? <em className="product-listing-live">Live</em> : null}
        </span>
        <b>{preview.productName}</b>
        <small>{preview.variantLabel} · {preview.condition === "new" ? "New" : preview.condition === "used" ? "Used" : preview.condition}</small>
        {preview.live
          ? <span className="product-listing-price">
            From {formatFromPrice(preview.fromPrice)}
            {preview.pickPrice && preview.pickPrice !== preview.fromPrice ? ` · Kelus pick ${formatFromPrice(preview.pickPrice)}` : ""}
          </span>
          : <span className="product-listing-price is-muted">Check availability</span>}
      </span>
      <Icon name="arrow" size={16} />
    </Link>
  );
}
