import type { Offer, Recommendation, RecommendationKind } from "@/types/kelus";

const currencyAmount = (value: number) => Math.round(value * 100) / 100;
export const knownOfferTotal = (offer: Offer) => offer.shippingCostKnown === false
  || !Number.isFinite(offer.price)
  || !Number.isFinite(offer.shippingCost)
  || offer.price < 0
  || offer.shippingCost < 0
  ? null
  : currencyAmount(offer.price + offer.shippingCost);
const conditionLabel = (condition: Offer["condition"]) => condition[0].toUpperCase() + condition.slice(1);
const returnDays = (offer: Offer) => Number(offer.returnPolicy?.match(/(\d+)-day/)?.[1] ?? 0);
const factual = (value?: string | null) => Boolean(value) && !/(unavailable|unknown)/i.test(value ?? "");

function sellerEvidence(offer: Offer) {
  const feedback = offer.seller.feedbackPercentage;
  const feedbackValue = feedback === undefined ? 0 : feedback >= 99.5 ? 10 : feedback >= 99 ? 7 : feedback >= 97 ? 3 : feedback < 95 ? -8 : 0;
  const scoreValue = (offer.seller.feedbackScore ?? 0) >= 1_000 ? 3 : (offer.seller.feedbackScore ?? 0) >= 100 ? 1 : 0;
  return feedbackValue + scoreValue + (offer.seller.topRated ? 4 : 0) + (offer.seller.sellerType === "retailer" ? 8 : 0);
}

function returnEvidence(offer: Offer) {
  if (/^no returns$/i.test(offer.returnPolicy)) return -8;
  const days = returnDays(offer);
  return days ? Math.min(days, 30) / 4 : 0;
}

function evidenceValue(offer: Offer) {
  const conditionValue = offer.condition === "new" ? 10 : offer.condition === "refurbished" ? 4 : 0;
  const shippingValue = offer.shippingCostKnown === false ? -50 : 6;
  return sellerEvidence(offer) + returnEvidence(offer) + conditionValue + shippingValue;
}

function comparableOffers(offers: Offer[]) {
  const known = offers.filter((offer) => knownOfferTotal(offer) !== null);
  return known.length ? known : offers;
}

function trustedForPick(offer: Offer) {
  if (offer.trust) return offer.trust.eligibleForRecommendation;
  return offer.dataSource !== "live" || offer.sourceProvider !== "ebay";
}

function pickCandidates(offers: Offer[]) {
  const trusted = offers.filter(trustedForPick);
  const high = trusted.filter((offer) => offer.trust?.confidence === "HIGH");
  return high.length ? high : trusted;
}

const rankingTotal = (offer: Offer) => knownOfferTotal(offer) ?? offer.price;
const pickValue = (offer: Offer, cheapest: number) => evidenceValue(offer) - (rankingTotal(offer) - cheapest) * 0.35;

function reasonsFor(offer: Offer, kind: RecommendationKind) {
  const total = knownOfferTotal(offer);
  const reasons: string[] = [total === null ? `$${offer.price} item price; shipping not provided` : `$${total} total including shipping`];
  if (kind !== "cheapest" && offer.seller.feedbackPercentage !== undefined) reasons.push(`${offer.seller.feedbackPercentage}% eBay feedback`);
  if (factual(offer.returnPolicy)) reasons.push(offer.returnPolicy);
  if (reasons.length < 3 && factual(offer.delivery)) reasons.push(offer.delivery);
  if (reasons.length < 3) reasons.push(`${conditionLabel(offer.condition)} condition`);
  return reasons.slice(0, 3);
}

export function getRecommendation(offers: Offer[], kind: RecommendationKind): Recommendation | null {
  if (!offers.length) return null;
  const candidates = kind === "kelus_pick" ? pickCandidates(offers) : offers;
  if (!candidates.length || (kind === "kelus_pick" && !candidates.some((offer) => knownOfferTotal(offer) !== null))) return null;
  const eligible = comparableOffers(candidates);
  const cheapestTotal = Math.min(...eligible.map(rankingTotal));
  const offer = kind === "cheapest"
    ? [...eligible].sort((a, b) => rankingTotal(a) - rankingTotal(b))[0]
    : kind === "safest_option"
      ? [...eligible].sort((a, b) => evidenceValue(b) - evidenceValue(a) || rankingTotal(a) - rankingTotal(b))[0]
      : [...eligible].sort((a, b) => pickValue(b, cheapestTotal) - pickValue(a, cheapestTotal) || rankingTotal(a) - rankingTotal(b))[0];
  return {
    offerId: offer.id,
    kind,
    reasons: reasonsFor(offer, kind),
    tradeoffs: ["Compare the listing’s condition, shipping, seller feedback, and return terms on eBay."],
  };
}

export function getCheaperAlternative(offers: Offer[], pick: Offer, minimumSavings = 10) {
  const pickTotal = knownOfferTotal(pick);
  if (pickTotal === null) return null;
  const candidates = offers.filter((offer) => offer.id !== pick.id
    && (!offer.trust || offer.trust.eligibleForRecommendation)
    && knownOfferTotal(offer) !== null
    && pickTotal - knownOfferTotal(offer)! >= minimumSavings)
    .sort((a, b) => knownOfferTotal(a)! - knownOfferTotal(b)!);
  const offer = candidates[0];
  if (!offer) return null;
  const savings = Math.round((pickTotal - knownOfferTotal(offer)!) * 100) / 100;
  const money = Number.isInteger(savings) ? `$${savings}` : `$${savings.toFixed(2)}`;
  let tradeoff = `Save ${money}; compare seller, delivery, and return terms.`;
  if (offer.condition !== pick.condition) tradeoff = `Save ${money} with ${offer.condition} condition instead of ${pick.condition}.`;
  else if (/^no returns$/i.test(offer.returnPolicy) && !/^no returns$/i.test(pick.returnPolicy)) tradeoff = `Save ${money}, but this listing does not accept returns.`;
  else if (!factual(offer.returnPolicy) && factual(pick.returnPolicy)) tradeoff = `Save ${money}, but return terms are not provided.`;
  else if (offer.seller.feedbackPercentage !== undefined && pick.seller.feedbackPercentage !== undefined && offer.seller.feedbackPercentage < pick.seller.feedbackPercentage) tradeoff = `Save ${money} with lower seller feedback (${offer.seller.feedbackPercentage}% vs ${pick.seller.feedbackPercentage}%).`;
  return { offer, savings, tradeoff };
}

export function sortOffers(offers: Offer[], mode: "recommended" | "lowest" | "highest") {
  const eligible = comparableOffers(offers);
  const cheapest = eligible.length ? Math.min(...eligible.map(rankingTotal)) : 0;
  return [...offers].sort((a, b) => mode === "lowest" ? (knownOfferTotal(a) === null ? 1 : knownOfferTotal(b) === null ? -1 : rankingTotal(a) - rankingTotal(b)) : mode === "highest" ? (knownOfferTotal(a) === null ? 1 : knownOfferTotal(b) === null ? -1 : rankingTotal(b) - rankingTotal(a)) : pickValue(b, cheapest) - pickValue(a, cheapest));
}
