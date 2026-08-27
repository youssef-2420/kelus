import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { normalizeEbayCondition } from "./providers/ebay/matching.ts";
import { applyEbayPriceAnomalyDetection, validateEbayCandidate } from "./providers/ebay/trust-engine.ts";

export function applySnapshotTrustGate(criteria: SearchCriteria, result: OfferSearchResult): OfferSearchResult | null {
  const product = getProductBySlug(criteria.productSlug);
  const variant = getVariantById(criteria.variantId);
  if (!product || !variant || !Array.isArray(result.offers)) return null;
  const retainedOffers = result.offers.filter((offer) => offer.sourceProvider !== "ebay");
  const offers = applyEbayPriceAnomalyDetection(result.offers.flatMap((offer) => {
    if (offer.sourceProvider !== "ebay") return [];
    const item = {
      itemId: offer.id,
      title: offer.sourceTitle ?? "",
      condition: offer.sourceCondition ?? offer.condition,
      buyingOptions: ["FIXED_PRICE"],
      categories: [{ categoryId: "9355", categoryName: "Cell Phones & Smartphones" }],
      seller: {
        username: offer.seller.name ?? undefined,
        feedbackPercentage: offer.seller.feedbackPercentage?.toString(),
        feedbackScore: offer.seller.feedbackScore,
      },
    };
    const validation = validateEbayCandidate(item, product, variant, criteria.condition);
    if (!validation.accepted) return [];
    const condition = normalizeEbayCondition(undefined, item.condition);
    return condition ? [{ offer: { ...offer, condition }, validation }] : [];
  }));
  return { ...result, offers: [...retainedOffers, ...offers] };
}
