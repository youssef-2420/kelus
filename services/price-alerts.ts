import { getProductBySlug, getVariantById } from "../lib/demo-data.ts";
import { canonicalProductPath } from "../lib/search-state.ts";
import type { OfferSearchResult, PriceContext, SearchCriteria } from "../types/kelus.ts";
import { getBuyWaitDecision, type BuyWaitDecision } from "./buy-wait-decision.ts";
import { getPriceContext } from "./price-context.ts";
import { knownOfferTotal } from "./recommendations.ts";

export const PRICE_ALERTS_KEY = "kelus:price-alerts:v1";
export const PRICE_ALERTS_CHANGED = "kelus:price-alerts-changed";
export const ALERT_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type PriceAlertState = "ready" | "unavailable" | "error";
export type PriceAlertStatus = "watching" | "price_dropped" | "target_reached" | "paused";

export type PriceAlertRecord = {
  id: string;
  criteria: SearchCriteria;
  productName: string;
  configuration: string;
  imageLabel: string;
  imageUrl?: string;
  trackedPrice: number | null;
  currentPrice: number | null;
  targetPrice: number | null;
  startedAt: string;
  lastCheckedAt?: string;
  lastSuccessfulAt?: string;
  currentOfferId?: string;
  currentListingUrl?: string;
  currentRetailer?: string;
  paused: boolean;
  state: PriceAlertState;
  errorMessage?: string;
  priceIntelligence?: PriceContext;
  buyWaitDecision?: BuyWaitDecision;
};

export function alertId(criteria: SearchCriteria) {
  return `${criteria.productSlug}|${criteria.variantId ?? "default"}|${criteria.condition}|${criteria.market}`;
}

export function bestLiveOffer(offers: OfferSearchResult["offers"]) {
  return offers
    .filter((offer) => offer.dataSource === "live" && knownOfferTotal(offer) !== null)
    .sort((a, b) => knownOfferTotal(a)! - knownOfferTotal(b)!)[0] ?? null;
}

function alertPriceIntelligence(criteria: SearchCriteria, result: OfferSearchResult) {
  const priceIntelligence = getPriceContext(criteria, result.observationsStored === true ? result.observations : []);
  return { priceIntelligence, buyWaitDecision: getBuyWaitDecision(priceIntelligence) };
}

export function createAlert(criteria: SearchCriteria, result: OfferSearchResult, now = new Date().toISOString()): PriceAlertRecord | null {
  if (result.isDemo) return null;
  const offer = bestLiveOffer(result.offers);
  const total = offer ? knownOfferTotal(offer) : null;
  if (!offer || total === null) return null;
  const product = getProductBySlug(criteria.productSlug);
  const variant = getVariantById(criteria.variantId);
  return {
    id: alertId(criteria), criteria,
    productName: product?.name ?? criteria.productSlug,
    configuration: [variant?.label, criteria.condition === "any" ? "Any condition" : `${criteria.condition[0].toUpperCase()}${criteria.condition.slice(1)}`].filter(Boolean).join(" · "),
    imageLabel: product?.image ?? "K",
    imageUrl: offer.imageUrl,
    trackedPrice: total,
    currentPrice: total,
    targetPrice: null,
    startedAt: now,
    lastCheckedAt: now,
    lastSuccessfulAt: result.lastUpdated ?? offer.lastUpdated ?? now,
    currentOfferId: offer.id,
    currentListingUrl: offer.affiliateUrl ?? undefined,
    currentRetailer: offer.retailer.name,
    paused: false,
    state: "ready",
    ...alertPriceIntelligence(criteria, result),
  };
}

export function updateAlertFromResult(alert: PriceAlertRecord, result: OfferSearchResult, checkedAt = new Date().toISOString()): PriceAlertRecord {
  const offer = !result.isDemo ? bestLiveOffer(result.offers) : null;
  const total = offer ? knownOfferTotal(offer) : null;
  if (!offer || total === null) return { ...alert, lastCheckedAt: checkedAt, state: "unavailable", errorMessage: "No matching live eBay offer is available right now." };
  const intelligence = alertPriceIntelligence(alert.criteria, result);
  return {
    ...alert,
    currentPrice: total,
    imageUrl: offer.imageUrl ?? alert.imageUrl,
    lastCheckedAt: checkedAt,
    lastSuccessfulAt: result.lastUpdated ?? offer.lastUpdated ?? checkedAt,
    currentOfferId: offer.id,
    currentListingUrl: offer.affiliateUrl ?? undefined,
    currentRetailer: offer.retailer.name,
    state: "ready",
    errorMessage: undefined,
    ...intelligence,
  };
}

export function updateAlertFromError(alert: PriceAlertRecord, message: string, checkedAt = new Date().toISOString()): PriceAlertRecord {
  return { ...alert, lastCheckedAt: checkedAt, state: "error", errorMessage: message };
}

export function getAlertStatus(alert: PriceAlertRecord): PriceAlertStatus {
  if (alert.paused) return "paused";
  if (alert.currentPrice !== null && alert.targetPrice !== null && alert.currentPrice <= alert.targetPrice) return "target_reached";
  if (alert.currentPrice !== null && alert.trackedPrice !== null && alert.currentPrice < alert.trackedPrice) return "price_dropped";
  return "watching";
}

export function getPriceChange(alert: PriceAlertRecord) {
  if (alert.currentPrice === null || alert.trackedPrice === null || alert.trackedPrice === 0) return null;
  const amount = Math.round((alert.currentPrice - alert.trackedPrice) * 100) / 100;
  return { amount, percent: Math.round((amount / alert.trackedPrice) * 1000) / 10 };
}

export function getDistanceFromTarget(alert: PriceAlertRecord) {
  if (alert.currentPrice === null || alert.targetPrice === null) return null;
  return Math.max(0, Math.round((alert.currentPrice - alert.targetPrice) * 100) / 100);
}

export function isAlertStale(alert: PriceAlertRecord, now = Date.now()) {
  return !alert.lastSuccessfulAt || now - Date.parse(alert.lastSuccessfulAt) > ALERT_STALE_AFTER_MS;
}

export function comparisonHref(alert: PriceAlertRecord) {
  return canonicalProductPath(alert.criteria);
}

function validAlert(value: unknown): value is PriceAlertRecord {
  if (!value || typeof value !== "object") return false;
  const alert = value as Partial<PriceAlertRecord>;
  return typeof alert.id === "string" && typeof alert.productName === "string" && typeof alert.startedAt === "string" && Boolean(alert.criteria) && alert.criteria?.market === "us";
}

export function readPriceAlerts(storage: Pick<Storage, "getItem"> = window.localStorage) {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PRICE_ALERTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(validAlert) : [];
  } catch { return []; }
}

export function writePriceAlerts(alerts: PriceAlertRecord[], storage: Pick<Storage, "setItem"> = window.localStorage) {
  storage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PRICE_ALERTS_CHANGED));
}

export function upsertPriceAlert(alert: PriceAlertRecord, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage) {
  const alerts = readPriceAlerts(storage);
  const next = alerts.some((item) => item.id === alert.id) ? alerts.map((item) => item.id === alert.id ? alert : item) : [alert, ...alerts];
  writePriceAlerts(next, storage);
  return next;
}
