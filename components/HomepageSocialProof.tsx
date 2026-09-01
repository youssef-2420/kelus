import { listProductListingPreviews } from "@/lib/bundled-snapshot-catalog";
import { products } from "@/lib/demo-data";

export function HomepageSocialProof() {
  const previews = listProductListingPreviews();
  const validated = previews.filter((preview) => preview.live).length;
  const indexed = products.length;
  return <p className="homepage-social-proof" aria-label="Kelus coverage summary">
    <span><strong>{validated}</strong> validated comparisons live now</span>
    <span><strong>{indexed}</strong> products indexed</span>
    <span>Prices checked every <strong>15 min</strong></span>
  </p>;
}
