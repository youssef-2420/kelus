import type { Offer, Recommendation, RecommendationKind } from "@/types/kelus";

const total = (offer: Offer) => offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
const rankingTotal = (offer: Offer) => total(offer) ?? offer.price + 10_000;
const conditionLabel = (condition: Offer["condition"]) => condition[0].toUpperCase() + condition.slice(1);
const returnDays = (offer: Offer) => Number(offer.returnPolicy?.match(/(\d+)-day/)?.[1] ?? 0);
const safetyValue = (offer: Offer) => (offer.seller.sellerType === "retailer" ? 4 : 1) + (offer.condition === "new" ? 4 : 1) + (offer.warranty?.includes("manufacturer") ? 2 : 0) + Math.min(returnDays(offer), 30) / 10 + (offer.seller.feedbackPercentage ?? 0) / 100;
const pickValue = (offer: Offer, cheapest: number) => safetyValue(offer) * 15 - (rankingTotal(offer) - cheapest);
const knownReasons = (...values: Array<string | null | undefined>) => values.filter((value): value is string => Boolean(value) && !/(unavailable|unknown)/i.test(value ?? ""));

export function getRecommendation(offers: Offer[], kind: RecommendationKind): Recommendation | null {
  if (!offers.length) return null;
  const cheapest = [...offers].sort((a, b) => rankingTotal(a) - rankingTotal(b))[0];
  const cheapestKnownTotal = rankingTotal(cheapest);
  const offer = kind === "cheapest"
    ? cheapest
    : kind === "safest_option"
      ? [...offers].sort((a, b) => safetyValue(b) - safetyValue(a))[0]
      : [...offers].sort((a, b) => pickValue(b, cheapestKnownTotal) - pickValue(a, cheapestKnownTotal))[0];
  const offerTotal = total(offer);
  const priceReason = offerTotal === null ? "$" + offer.price + " item price; shipping unavailable" : "$" + offerTotal + " including shipping";
  if (kind === "cheapest") {
    return {
      offerId: offer.id,
      kind,
      reasons: knownReasons(offerTotal === null ? "Lowest matching item price among connected offers; shipping unavailable: $" + offer.price : "Lowest known total among connected offers: $" + offerTotal + " including shipping", conditionLabel(offer.condition) + " condition", offer.delivery),
      tradeoffs: [offer.condition === "new" ? "Compare return and warranty terms before choosing." : "Used condition and seller terms differ from new offers."],
    };
  }
  if (kind === "safest_option") {
    return {
      offerId: offer.id,
      kind,
      reasons: knownReasons(offer.seller.feedbackPercentage !== undefined ? offer.seller.feedbackPercentage + "% eBay feedback" : null, conditionLabel(offer.condition) + " condition", offer.warranty, offer.returnPolicy),
      tradeoffs: ["Review the listing terms on eBay before buying."],
    };
  }
  return {
    offerId: offer.id,
    kind,
    reasons: knownReasons(priceReason, conditionLabel(offer.condition) + " condition", offer.seller.feedbackPercentage !== undefined ? offer.seller.feedbackPercentage + "% eBay feedback" : null, offer.returnPolicy, offer.delivery),
    tradeoffs: ["Compare condition, shipping, seller, and return details before choosing."],
  };
}

export function sortOffers(offers: Offer[], mode: "recommended" | "lowest" | "highest") {
  const cheapest = offers.length ? Math.min(...offers.map(rankingTotal)) : 0;
  return [...offers].sort((a, b) => mode === "lowest" ? rankingTotal(a) - rankingTotal(b) : mode === "highest" ? rankingTotal(b) - rankingTotal(a) : pickValue(b, cheapest) - pickValue(a, cheapest));
}
