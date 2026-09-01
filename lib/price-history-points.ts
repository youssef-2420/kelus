import type { PriceObservation, SearchCriteria } from "../types/kelus.ts";
import { exactRealPriceObservations } from "../services/price-intelligence.ts";

export function historyPointsFromObservations(observations: PriceObservation[], criteria: Pick<SearchCriteria, "variantId" | "condition">) {
  const daily = new Map<string, number>();
  exactRealPriceObservations(observations, {
    variantId: criteria.variantId ?? "",
    condition: criteria.condition,
  }).forEach((item) => {
    const day = item.timestamp.slice(0, 10);
    const total = item.price + (item.shippingCost ?? 0);
    daily.set(day, Math.min(daily.get(day) ?? Number.POSITIVE_INFINITY, total));
  });
  return [...daily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([day, price]) => ({ label: day.slice(5), price: Math.round(price) }));
}
