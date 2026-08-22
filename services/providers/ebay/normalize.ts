import type { Offer, PriceObservation, Product, ProductVariant, Retailer } from "@/types/kelus";
import type { EbayItemSummary, EbayShippingOption } from "@/services/providers/ebay/types";
import { normalizeEbayCondition } from "./matching.ts";

const ebayRetailer: Retailer = { id: "ebay", name: "eBay", logo: "e", website: "https://www.ebay.com" };

function amount(value?: string, currency?: string) {
  const parsed = Number(value);
  return currency === "USD" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function shipping(option?: EbayShippingOption) {
  if (!option) return { cost: null, label: null };
  const cost = amount(option.shippingCost?.value, option.shippingCost?.currency);
  const date = option.minEstimatedDeliveryDate || option.maxEstimatedDeliveryDate;
  if (date && !Number.isNaN(Date.parse(date))) {
    const label = "Delivery by " + new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
    return { cost, label };
  }
  if (cost === 0) return { cost, label: "Free shipping" };
  if (cost !== null) return { cost, label: "$" + cost.toFixed(2) + " shipping" };
  return { cost: null, label: null };
}

function safeEbayUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || (url.hostname !== "ebay.com" && !url.hostname.endsWith(".ebay.com"))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function location(item: EbayItemSummary) {
  const value = [item.itemLocation?.city, item.itemLocation?.stateOrProvince, item.itemLocation?.country].filter(Boolean).join(", ");
  return value || undefined;
}

export function normalizeEbayItem(item: EbayItemSummary, product: Product, variant: ProductVariant, fetchedAt: string): Offer | null {
  const condition = normalizeEbayCondition(item.conditionId, item.condition);
  const price = amount(item.price?.value, item.price?.currency);
  const destination = safeEbayUrl(item.itemWebUrl);
  if (!item.itemId || !item.title || price === null || !condition || !destination) return null;
  const selectedShipping = [...(item.shippingOptions ?? [])]
    .map((option) => ({ option, cost: amount(option.shippingCost?.value, option.shippingCost?.currency) }))
    .sort((a, b) => (a.cost ?? Number.POSITIVE_INFINITY) - (b.cost ?? Number.POSITIVE_INFINITY))[0]?.option;
  const normalizedShipping = shipping(selectedShipping);
  const sellerName = item.seller?.username?.trim() || null;
  const feedbackPercentage = Number(item.seller?.feedbackPercentage);

  return {
    id: "ebay-" + item.itemId,
    productId: product.id,
    variantId: variant.id,
    retailer: ebayRetailer,
    seller: {
      id: sellerName ? "ebay-seller-" + sellerName.toLowerCase() : "ebay-seller-unknown",
      retailerId: "ebay",
      name: sellerName,
      sellerType: "marketplace_seller",
      feedbackPercentage: Number.isFinite(feedbackPercentage) ? feedbackPercentage : undefined,
      feedbackScore: Number.isFinite(item.seller?.feedbackScore) ? item.seller?.feedbackScore : undefined,
      topRated: item.topRatedBuyingExperience || undefined,
    },
    price,
    currency: "USD",
    condition,
    shippingCost: normalizedShipping.cost ?? 0,
    shippingCostKnown: normalizedShipping.cost !== null,
    delivery: normalizedShipping.label ?? "Shipping details unavailable",
    availability: "Unknown",
    warranty: "Warranty information unavailable",
    returnPolicy: "Return terms unavailable",
    affiliateUrl: destination,
    lastUpdated: fetchedAt,
    dataSource: "live",
    sourceProvider: "ebay",
    sourceCondition: item.condition,
    imageUrl: item.image?.imageUrl,
    itemLocation: location(item),
  };
}

export function observationForEbayOffer(offer: Offer): PriceObservation {
  return {
    id: offer.id + "-" + offer.lastUpdated,
    offerId: offer.id,
    variantId: offer.variantId,
    providerId: "ebay",
    retailerId: "ebay",
    price: offer.price,
    shippingCost: offer.shippingCostKnown === false ? null : offer.shippingCost,
    condition: offer.condition,
    availability: offer.availability,
    timestamp: offer.lastUpdated,
    isDemo: false,
  };
}
