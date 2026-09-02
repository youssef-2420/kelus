import { listProductListingPreviews } from "@/lib/bundled-snapshot-catalog";

export function HomepageSocialProof() {
  const previews = listProductListingPreviews();
  const validated = previews.filter((preview) => preview.live).length;
  return <p className="homepage-social-proof" aria-label="Kelus coverage summary">
    <span>Prices rechecked every <strong>15 min</strong></span>
    <span><strong>{validated}</strong> live comparisons</span>
    <span>Known totals before you click through</span>
  </p>;
}
