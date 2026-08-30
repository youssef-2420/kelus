import type { Offer, PriceContext, Recommendation, SearchCriteria, TrustConfidence } from "@/types/kelus";
import { getBuyWaitDecision, type BuyWaitDecision } from "./buy-wait-decision.ts";
import { getCheaperAlternative, getRecommendation, knownOfferTotal } from "./recommendations.ts";

export type KelusDecision = {
  pick: Offer | null;
  cheapest: Offer | null;
  pickRecommendation: Recommendation | null;
  cheapestRecommendation: Recommendation | null;
  confidence: TrustConfidence | "UNAVAILABLE";
  totalPrice: number | null;
  sellerName: string;
  retailerName: string;
  reasons: string[];
  cheaperTradeoff: string | null;
  buyWaitDecision: BuyWaitDecision;
  trackRecommended: boolean;
};

const conditionLabel = (condition: Offer["condition"]) => condition.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
const money = (value: number) => Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
const factual = (value?: string | null) => Boolean(value) && !/(unavailable|unknown)/i.test(value ?? "");

function eligibleForRecommendation(offer: Offer) {
  if (offer.trust) return offer.trust.eligibleForRecommendation && offer.trust.confidence !== "LOW";
  return offer.dataSource !== "live" || offer.sourceProvider !== "ebay";
}

function cheapestEligibleOffer(offers: Offer[]) {
  return offers
    .filter((offer) => eligibleForRecommendation(offer) && knownOfferTotal(offer) !== null)
    .sort((a, b) => knownOfferTotal(a)! - knownOfferTotal(b)!)[0] ?? null;
}

function cheapestAcceptedOffer(offers: Offer[]) {
  return offers
    .filter((offer) => knownOfferTotal(offer) !== null)
    .sort((a, b) => knownOfferTotal(a)! - knownOfferTotal(b)!)[0] ?? null;
}

function decisionReasons(offer: Offer, recommendation: Recommendation | null) {
  const reasons = [...(recommendation?.reasons ?? [])];
  if (!reasons.some((reason) => /condition/i.test(reason))) reasons.push(`${conditionLabel(offer.condition)} condition`);
  if (offer.seller.topRated && !reasons.some((reason) => /top rated/i.test(reason))) reasons.push("Top Rated seller");
  if (factual(offer.returnPolicy) && !reasons.includes(offer.returnPolicy)) reasons.push(offer.returnPolicy);
  return [...new Set(reasons)].slice(0, 3);
}

function cheaperTradeoff(pick: Offer, cheapest: Offer | null, offers: Offer[]) {
  if (!cheapest || cheapest.id === pick.id) return null;
  const pickTotal = knownOfferTotal(pick);
  const cheapestTotal = knownOfferTotal(cheapest);
  if (pickTotal === null || cheapestTotal === null || pickTotal <= cheapestTotal) return null;
  const delta = money(Math.round((pickTotal - cheapestTotal) * 100) / 100);
  if (cheapest.trust?.suspiciousPrice) return `${delta} more than the cheapest, but the cheaper offer is an unusually low price with insufficient comparison evidence.`;
  if (pick.condition !== cheapest.condition) return `${delta} more than the cheapest, but ${conditionLabel(pick.condition)} instead of ${conditionLabel(cheapest.condition)}.`;
  const existing = getCheaperAlternative(offers, pick, 0);
  if (existing?.offer.id === cheapest.id) {
    return `${delta} more than the cheapest, but ${existing.tradeoff.replace(/^Save \$[\d.]+;?\s*/i, "").replace(/^with /i, "")}`;
  }
  if ((pick.trust?.confidence ?? "LOW") !== (cheapest.trust?.confidence ?? "LOW")) return `${delta} more than the cheapest, but with stronger confidence evidence.`;
  if (factual(pick.returnPolicy) && !factual(cheapest.returnPolicy)) return `${delta} more than the cheapest, but with clearer return terms.`;
  return `${delta} more than the cheapest, but with a stronger balance of confidence, seller, shipping, and returns evidence.`;
}

export function buildKelusDecision(criteria: SearchCriteria, offers: Offer[], priceContext: PriceContext): KelusDecision {
  void criteria;
  const pickRecommendation = getRecommendation(offers, "kelus_pick");
  const pick = offers.find((offer) => offer.id === pickRecommendation?.offerId) ?? null;
  const cheapestRecommendation = getRecommendation(offers.filter(eligibleForRecommendation), "cheapest");
  const cheapest = cheapestAcceptedOffer(offers) ?? offers.find((offer) => offer.id === cheapestRecommendation?.offerId) ?? cheapestEligibleOffer(offers);
  const buyWaitDecision = getBuyWaitDecision(priceContext);
  const totalPrice = pick ? knownOfferTotal(pick) : null;
  return {
    pick,
    cheapest,
    pickRecommendation,
    cheapestRecommendation,
    confidence: pick?.trust?.confidence ?? (pick ? "MEDIUM" : "UNAVAILABLE"),
    totalPrice,
    sellerName: pick?.seller.name || "Seller unavailable",
    retailerName: pick?.retailer.name ?? "Retailer unavailable",
    reasons: pick ? decisionReasons(pick, pickRecommendation) : ["No recommendation-quality offer is available yet."],
    cheaperTradeoff: pick ? cheaperTradeoff(pick, cheapest, offers) : null,
    buyWaitDecision,
    trackRecommended: buyWaitDecision.label === "HISTORY BUILDING" || buyWaitDecision.label === "CONSIDER WAITING",
  };
}
