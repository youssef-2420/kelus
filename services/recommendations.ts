import type { Offer, Recommendation, RecommendationKind } from "@/types/kelus";

export function getRecommendation(offers: Offer[], kind: RecommendationKind): Recommendation {
  const sortedByPrice = [...offers].sort((a, b) => a.price - b.price);
  const offer = kind === "cheapest" ? sortedByPrice[0] : kind === "safest_option" ? offers.find((item) => item.condition === "New" && item.returnPolicy.includes("30")) ?? offers[0] : offers.find((item) => item.retailer.id === "amazon") ?? offers[0];
  if (kind === "cheapest") return { offerId: offer.id, kind, reasons: [`Save $${offers[0].price - offer.price}`, offer.condition, offer.returnPolicy], tradeoffs: ["Different retailer warranty and return terms"] };
  if (kind === "safest_option") return { offerId: offer.id, kind, reasons: [offer.condition, offer.warranty, offer.returnPolicy, "Established retailer"], tradeoffs: ["Same price as the Kelus Pick"] };
  return { offerId: offer.id, kind, reasons: ["Same price as another major retailer", offer.condition, offer.returnPolicy, offer.warranty, "Free delivery"], tradeoffs: [`$${offer.price - sortedByPrice[0].price} more than the cheapest used alternative`] };
}
