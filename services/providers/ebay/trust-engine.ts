import type { ConditionFilter, Offer, OfferCondition, OfferTrust, Product, ProductVariant, TrustConfidence } from "../../../types/kelus.ts";
import type { EbayItemSummary } from "./types.ts";
import {
  ebayItemText,
  isAccessory,
  isActiveListing,
  isFixedPrice,
  isPartsOnly,
  matchesModel,
  matchesPhoneCategory,
  matchesStorage,
  matchesStructuredIdentifier,
  normalizeEbayCondition,
} from "./matching.ts";

type Evidence = "structured" | "title" | "missing";
export type EbayTrustValidation = {
  accepted: boolean;
  confidence: TrustConfidence;
  reasons: string[];
  modelEvidence: Evidence;
  storageEvidence: Evidence;
  lockEvidence: Evidence;
  strongerValidation: boolean;
};

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const carrierPattern = /\b(verizon|at t|att|t mobile|tmobile|sprint|cricket|boost mobile|straight talk|us cellular)\b/;

function aspectValues(item: EbayItemSummary, names: string[]) {
  const acceptedNames = new Set(names.map(compact));
  return (item.localizedAspects ?? [])
    .filter((aspect) => acceptedNames.has(compact(aspect.name ?? "")))
    .map((aspect) => aspect.value?.trim() ?? "")
    .filter(Boolean);
}

function titleCondition(title?: string): OfferCondition | null {
  const value = compact(title ?? "");
  if (!value) return null;
  if (/\b(open box|unsealed|opened box|new other)\b/.test(value)) return "open_box";
  if (/\b(refurbished|renewed|remanufactured)\b/.test(value)) return "refurbished";
  if (/\b(used|pre owned|preowned)\b/.test(value)) return "used";
  if (/\b(brand new|factory sealed|new sealed|sealed)\b/.test(value)) return "new";
  return null;
}

function lockEvidence(value?: string): true | false | null {
  const text = compact(value ?? "");
  if (!text) return null;
  if (/\b(factory unlocked|fully unlocked|unlocked)\b/.test(text)) return true;
  if (/\blocked\b/.test(text) || carrierPattern.test(text)) return false;
  return null;
}

function fail(reason: string, base: Partial<EbayTrustValidation> = {}): EbayTrustValidation {
  return {
    accepted: false,
    confidence: "LOW",
    reasons: [reason],
    modelEvidence: "missing",
    storageEvidence: "missing",
    lockEvidence: "missing",
    strongerValidation: false,
    ...base,
  };
}

function lowerConfidence(current: TrustConfidence, maximum: TrustConfidence): TrustConfidence {
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
  return rank[current] > rank[maximum] ? maximum : current;
}

export function validateEbayCandidate(
  item: EbayItemSummary,
  product: Product,
  variant: ProductVariant,
  requestedCondition: ConditionFilter,
): EbayTrustValidation {
  if (!item.itemId || !item.title || !ebayItemText(item)) return fail("Listing identity or title is missing.");
  if (isAccessory(item)) return fail("Listing title indicates an accessory rather than the product.");
  if (isPartsOnly(item)) return fail("Listing is for parts, repair, or a non-working product.");
  if (!matchesPhoneCategory(item)) return fail("eBay category is not a phone category.");
  if (!isFixedPrice(item)) return fail("Listing is not a fixed-price offer.");
  if (!isActiveListing(item)) return fail("Listing is no longer active.");

  const modelAspects = aspectValues(item, ["Model", "Product Name", "Series"]);
  if (modelAspects.some((value) => !matchesModel({ title: value }, product))) {
    return fail("Structured eBay model conflicts with the selected product.", { modelEvidence: "structured" });
  }
  if (!matchesModel(item, product)) {
    return fail(modelAspects.length ? "Listing title conflicts with the structured eBay model." : "Listing title does not match the exact model.", {
      modelEvidence: modelAspects.length ? "structured" : "title",
    });
  }
  const modelEvidence: Evidence = modelAspects.length ? "structured" : "title";

  const storageAspects = aspectValues(item, ["Storage Capacity", "Storage", "Internal Storage"]);
  if (storageAspects.some((value) => !matchesStorage({ title: value }, variant))) {
    return fail("Structured eBay storage conflicts with the selected variant.", { modelEvidence, storageEvidence: "structured" });
  }
  if (!matchesStorage(item, variant)) {
    return fail(storageAspects.length ? "Listing title conflicts with the structured storage value." : "Listing title does not match the exact storage variant.", {
      modelEvidence,
      storageEvidence: storageAspects.length ? "structured" : "title",
    });
  }
  const storageEvidence: Evidence = storageAspects.length ? "structured" : "title";

  const lockAspects = aspectValues(item, ["Lock Status", "Network", "Carrier", "Network Lock"]);
  const structuredLock = lockAspects.map(lockEvidence).find((value) => value !== null) ?? null;
  const titleLock = lockEvidence(item.title);
  if (structuredLock === false) return fail("Structured eBay lock status indicates a locked or carrier-specific phone.", { modelEvidence, storageEvidence, lockEvidence: "structured" });
  if (titleLock === false) return fail(structuredLock === true ? "Listing title conflicts with eBay's structured unlocked status." : "Listing title indicates a locked or carrier-specific phone.", { modelEvidence, storageEvidence, lockEvidence: structuredLock === null ? "title" : "structured" });
  const resolvedLockEvidence: Evidence = structuredLock === true ? "structured" : titleLock === true ? "title" : "missing";

  const structuredCondition = normalizeEbayCondition(item.conditionId, item.condition);
  if (!structuredCondition) return fail("eBay condition is missing or unsupported.", { modelEvidence, storageEvidence, lockEvidence: resolvedLockEvidence });
  const conditionInTitle = titleCondition(item.title);
  if (conditionInTitle && conditionInTitle !== structuredCondition) {
    return fail(`Condition conflict: eBay reports ${structuredCondition.replace("_", " ")} but the title indicates ${conditionInTitle.replace("_", " ")}.`, { modelEvidence, storageEvidence, lockEvidence: resolvedLockEvidence });
  }
  if (requestedCondition !== "any" && structuredCondition !== requestedCondition) {
    return fail(`Listing condition ${structuredCondition.replace("_", " ")} does not match requested ${requestedCondition}.`, { modelEvidence, storageEvidence, lockEvidence: resolvedLockEvidence });
  }

  const identifierMatch = matchesStructuredIdentifier(item, product, variant);
  if (identifierMatch === false) return fail("Structured eBay product identifier conflicts with the selected product.", { modelEvidence, storageEvidence, lockEvidence: resolvedLockEvidence });

  const feedback = Number(item.seller?.feedbackPercentage);
  const score = Number(item.seller?.feedbackScore);
  const sellerName = item.seller?.username?.trim();
  const completeSeller = Boolean(sellerName) && Number.isFinite(feedback) && feedback >= 0 && feedback <= 100 && Number.isFinite(score) && score >= 0;
  const partialSeller = Boolean(sellerName) && (Number.isFinite(feedback) || Number.isFinite(score));

  let points = 1; // fixed-price listing
  points += modelEvidence === "structured" ? 3 : 1;
  points += storageEvidence === "structured" ? 3 : 1;
  points += resolvedLockEvidence === "structured" ? 2 : resolvedLockEvidence === "title" ? 1 : 0;
  points += 2; // recognized structured eBay condition
  points += conditionInTitle ? 1 : 0;
  points += identifierMatch === true ? 2 : 0;
  points += completeSeller ? 1 : 0;
  let confidence: TrustConfidence = points >= 11 ? "HIGH" : points >= 7 ? "MEDIUM" : "LOW";
  if (resolvedLockEvidence === "missing" || !sellerName) confidence = "LOW";
  else if (!completeSeller || feedback < 95) confidence = lowerConfidence(confidence, "MEDIUM");

  const reasons = [
    `${modelEvidence === "structured" ? "Structured eBay data and title" : "Listing title"} match the exact model.`,
    `${storageEvidence === "structured" ? "Structured eBay data and title" : "Listing title"} match ${variant.storage ?? variant.label}.`,
    resolvedLockEvidence === "structured" ? "Structured eBay lock status confirms unlocked." : resolvedLockEvidence === "title" ? "Listing title explicitly states unlocked." : "Lock status is not confirmed.",
    `eBay condition is ${structuredCondition.replace("_", " ")}${conditionInTitle ? " and the title is consistent" : ""}.`,
    completeSeller ? `Seller evidence is available (${feedback}% feedback, ${score} ratings).` : partialSeller ? "Seller evidence is incomplete." : "Seller identity and feedback evidence are missing.",
  ];
  const strongerValidation = modelEvidence === "structured"
    && storageEvidence === "structured"
    && resolvedLockEvidence === "structured"
    && completeSeller
    && feedback >= 98
    && score >= 100;
  return { accepted: true, confidence, reasons, modelEvidence, storageEvidence, lockEvidence: resolvedLockEvidence, strongerValidation };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function knownTotal(offer: Offer) {
  return offer.shippingCostKnown === false ? null : offer.price + offer.shippingCost;
}

export function applyEbayPriceAnomalyDetection(candidates: Array<{ offer: Offer; validation: EbayTrustValidation }>) {
  const groups = new Map<string, Array<{ offer: Offer; validation: EbayTrustValidation }>>();
  for (const candidate of candidates) {
    const key = `${candidate.offer.variantId}:${candidate.offer.condition}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  return candidates.map(({ offer, validation }) => {
    const totals = (groups.get(`${offer.variantId}:${offer.condition}`) ?? [])
      .map((candidate) => knownTotal(candidate.offer))
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const total = knownTotal(offer);
    const clusterMedian = totals.length >= 4 ? median(totals) : null;
    const suspiciousPrice = total !== null && clusterMedian !== null && clusterMedian - total >= 100 && total <= clusterMedian * 0.65;
    const anomalyPassed = !suspiciousPrice || validation.strongerValidation;
    const confidence: TrustConfidence = suspiciousPrice && !validation.strongerValidation ? "LOW" : validation.confidence;
    const reasons = [...validation.reasons];
    if (suspiciousPrice) reasons.push(validation.strongerValidation
      ? `Price is unusually low versus the $${Math.round(clusterMedian)} comparable-offer median, but stronger structured and seller checks passed.`
      : `Price is unusually low versus the $${Math.round(clusterMedian)} comparable-offer median and requires stronger validation.`);
    const trust: OfferTrust = {
      confidence,
      reasons,
      suspiciousPrice,
      eligibleForRecommendation: anomalyPassed && confidence !== "LOW",
      eligibleForHistory: anomalyPassed && confidence !== "LOW",
    };
    return { ...offer, trust };
  });
}
