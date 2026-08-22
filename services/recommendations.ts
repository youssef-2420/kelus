import type { Offer, Recommendation, RecommendationKind } from "@/types/kelus";

const total = (offer: Offer) => offer.price + offer.shippingCost;
const conditionLabel = (condition: Offer["condition"]) => condition[0].toUpperCase() + condition.slice(1);
const returnDays = (offer: Offer) => Number(offer.returnPolicy.match(/(\d+)-day/)?.[1] ?? 0);
const safetyValue = (offer: Offer) => (offer.seller.sellerType === "retailer" ? 4 : 1) + (offer.condition === "new" ? 4 : 1) + (offer.warranty.includes("manufacturer") ? 2 : 0) + Math.min(returnDays(offer), 30) / 10;
const pickValue = (offer: Offer, cheapest: number) => safetyValue(offer) * 15 - (total(offer) - cheapest);

export function getRecommendation(offers: Offer[], kind: RecommendationKind): Recommendation | null {
  if (!offers.length) return null;
  const cheapest = [...offers].sort((a, b) => total(a) - total(b))[0];
  const offer = kind === "cheapest" ? cheapest : kind === "safest_option" ? [...offers].sort((a, b) => safetyValue(b) - safetyValue(a))[0] : [...offers].sort((a, b) => pickValue(b, total(cheapest)) - pickValue(a, total(cheapest)))[0];
  if (kind === "cheapest") return { offerId: offer.id, kind, reasons: [`Lowest qualifying price at $${total(offer)}`, `${conditionLabel(offer.condition)} condition`, offer.delivery], tradeoffs: [offer.condition === "new" ? "Compare return and warranty terms before choosing." : "Used condition and seller terms differ from new retailer offers."] };
  if (kind === "safest_option") return { offerId: offer.id, kind, reasons: [offer.seller.sellerType === "retailer" ? "Established retailer" : "Known marketplace seller", `${conditionLabel(offer.condition)} condition`, offer.warranty, offer.returnPolicy], tradeoffs: [total(offer) === total(cheapest) ? "Same price as the lowest offer." : `$${total(offer) - total(cheapest)} more than the cheapest offer.`] };
  return { offerId: offer.id, kind, reasons: [`$${total(offer)} total price`, `${conditionLabel(offer.condition)} condition`, offer.returnPolicy, offer.warranty, offer.delivery], tradeoffs: [total(offer) === total(cheapest) ? "No price trade-off against the cheapest offer." : `$${total(offer) - total(cheapest)} more than the cheapest offer.`] };
}

export function sortOffers(offers: Offer[], mode: "recommended" | "lowest" | "highest") {
  const cheapest = offers.length ? Math.min(...offers.map(total)) : 0;
  return [...offers].sort((a, b) => mode === "lowest" ? total(a) - total(b) : mode === "highest" ? total(b) - total(a) : pickValue(b, cheapest) - pickValue(a, cheapest));
}
