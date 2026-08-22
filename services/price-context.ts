import type { Offer, PriceContext, PriceObservation } from "@/types/kelus";

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
export function getPriceContext(offers: Offer[], observations: PriceObservation[]): PriceContext {
  const knownTotals = offers.flatMap((offer) => offer.shippingCostKnown === false ? [] : [offer.price + offer.shippingCost]);
  const currentTrustedPrice = knownTotals.length ? Math.min(...knownTotals) : null;
  const live = observations.filter((observation) => !observation.isDemo && !Number.isNaN(Date.parse(observation.timestamp)));
  if (live.length) {
    const sorted = [...live].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const distinctDays = new Set(sorted.map((observation) => observation.timestamp.slice(0, 10))).size;
    const spanDays = (Date.parse(sorted.at(-1)!.timestamp) - Date.parse(sorted[0].timestamp)) / 86_400_000;
    const totals = sorted.flatMap((observation) => observation.shippingCost === null || observation.shippingCost === undefined ? [] : [observation.price + observation.shippingCost]);
    const ready = distinctDays >= 7 && spanDays >= 6 && totals.length > 0;
    if (!ready) return { currentTrustedPrice, average30Day: null, average90Day: null, recentLow: null, recentHigh: null, trend: "stable", verdict: "Price history is building", isDemo: false, historyStatus: "building", observationCount: live.length };
    const latest = Date.parse(sorted.at(-1)!.timestamp);
    const last30 = sorted.filter((observation) => Date.parse(observation.timestamp) >= latest - 30 * 86_400_000).flatMap((observation) => observation.shippingCost === null || observation.shippingCost === undefined ? [] : [observation.price + observation.shippingCost]);
    const average30Day = average(last30);
    const average90Day = spanDays >= 89 ? average(totals) : null;
    const recentLow = Math.min(...totals);
    const recentHigh = Math.max(...totals);
    const trend = totals.length < 2 ? "stable" : totals.at(-1)! < totals[0] ? "falling" : totals.at(-1)! > totals[0] ? "rising" : "stable";
    const verdict = currentTrustedPrice !== null && average30Day !== null
      ? currentTrustedPrice < average30Day ? "Below the recent observed average" : currentTrustedPrice > average30Day ? "Above the recent observed average" : "Near the recent observed average"
      : "Recent price context available";
    return { currentTrustedPrice, average30Day, average90Day, recentLow, recentHigh, trend, verdict, isDemo: false, historyStatus: "ready", observationCount: live.length };
  }
  const values = observations.map((observation) => observation.price);
  const recentLow = values.length ? Math.min(...values) : null;
  const recentHigh = values.length ? Math.max(...values) : null;
  const average90Day = average(values);
  const average30Day = average(values.slice(-3));
  const trend = values.length < 2 ? "stable" : values.at(-1)! < values[0] ? "falling" : values.at(-1)! > values[0] ? "rising" : "stable";
  const isDemo = observations.some((observation) => observation.isDemo);
  return { currentTrustedPrice, average30Day, average90Day, recentLow, recentHigh, trend, verdict: isDemo ? currentTrustedPrice !== null && average90Day !== null && currentTrustedPrice <= average90Day ? "Good time to buy" : "Watch for a better price" : "Price history is building", isDemo, historyStatus: isDemo ? "demo" : "building", observationCount: observations.length };
}
