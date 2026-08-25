import { searchCriteriaToQuery } from "../lib/search-state.ts";
import type { OfferSearchResult, SearchCriteria } from "../types/kelus.ts";
import { getAlertStatus, type PriceAlertRecord, updateAlertFromError, updateAlertFromResult } from "./price-alerts.ts";

export const MEANINGFUL_DROP_MIN_DOLLARS = 5;
export const MEANINGFUL_DROP_MIN_PERCENT = 1;

export type OwnedPriceAlert = { userId: string; alert: PriceAlertRecord };
export type PriceAlertEventType = "price_drop" | "target_reached";
export type PriceAlertEvent = {
  eventKey: string;
  userId: string;
  alertId: string;
  type: PriceAlertEventType;
  occurredAt: string;
  data: {
    productName: string;
    previousPrice: number | null;
    currentPrice: number | null;
    targetPrice: number | null;
    comparisonHref: string;
  };
};

export type AlertMonitorResult = {
  updates: OwnedPriceAlert[];
  events: PriceAlertEvent[];
  searchedConfigurations: number;
  failedConfigurations: number;
};

const criteriaKey = (criteria: SearchCriteria) => searchCriteriaToQuery(criteria);
const roundMoney = (value: number) => Math.round(value * 100) / 100;

function meaningfulDrop(previous: number | null, current: number | null) {
  if (previous === null || current === null || previous <= 0 || current >= previous) return false;
  const amount = previous - current;
  const percent = (amount / previous) * 100;
  return amount >= MEANINGFUL_DROP_MIN_DOLLARS && percent >= MEANINGFUL_DROP_MIN_PERCENT;
}

function eventFor(owner: OwnedPriceAlert, next: PriceAlertRecord, type: PriceAlertEventType, checkedAt: string): PriceAlertEvent {
  return {
    eventKey: `${owner.userId}|${owner.alert.id}|${type}|${next.currentPrice ?? "unknown"}|${checkedAt}`,
    userId: owner.userId,
    alertId: owner.alert.id,
    type,
    occurredAt: checkedAt,
    data: {
      productName: next.productName,
      previousPrice: owner.alert.currentPrice,
      currentPrice: next.currentPrice,
      targetPrice: next.targetPrice,
      comparisonHref: `/results-v2?${criteriaKey(next.criteria)}`,
    },
  };
}

export async function monitorAlertRecords(
  records: OwnedPriceAlert[],
  search: (criteria: SearchCriteria) => Promise<OfferSearchResult>,
  checkedAt = new Date().toISOString(),
): Promise<AlertMonitorResult> {
  const active = records.filter(({ alert }) => !alert.paused);
  const grouped = new Map<string, OwnedPriceAlert[]>();
  for (const record of active) {
    const key = criteriaKey(record.alert.criteria);
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  const updates: OwnedPriceAlert[] = [];
  const events: PriceAlertEvent[] = [];
  let failedConfigurations = 0;

  await Promise.all([...grouped.values()].map(async (group) => {
    try {
      const result = await search(group[0].alert.criteria);
      for (const owner of group) {
        const previousStatus = getAlertStatus(owner.alert);
        const next = updateAlertFromResult(owner.alert, result, checkedAt);
        const nextStatus = getAlertStatus(next);
        updates.push({ userId: owner.userId, alert: next });
        if (next.state !== "ready") continue;
        if (nextStatus === "target_reached" && previousStatus !== "target_reached") events.push(eventFor(owner, next, "target_reached", checkedAt));
        else if (meaningfulDrop(owner.alert.currentPrice, next.currentPrice)) events.push(eventFor(owner, next, "price_drop", checkedAt));
      }
    } catch (reason) {
      failedConfigurations += 1;
      const message = reason instanceof Error ? reason.message : "The latest price check failed.";
      for (const owner of group) updates.push({ userId: owner.userId, alert: updateAlertFromError(owner.alert, message, checkedAt) });
    }
  }));

  return { updates, events, searchedConfigurations: grouped.size, failedConfigurations };
}

export function priceDropSummary(previous: number, current: number) {
  const amount = roundMoney(previous - current);
  const percent = Math.round((amount / previous) * 1000) / 10;
  return { amount, percent };
}
