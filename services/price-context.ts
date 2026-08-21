import type { Offer, PriceContext, PriceObservation } from "@/types/kelus";

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
export function getPriceContext(offers: Offer[], observations: PriceObservation[]): PriceContext {
  const values = observations.map((observation) => observation.price);
  const currentTrustedPrice = offers.length ? Math.min(...offers.map((offer) => offer.price + offer.shippingCost)) : null;
  const recentLow = values.length ? Math.min(...values) : null;
  const recentHigh = values.length ? Math.max(...values) : null;
  const average90Day = average(values);
  const average30Day = average(values.slice(-3));
  const trend = values.length < 2 ? "stable" : values.at(-1)! < values[0] ? "falling" : values.at(-1)! > values[0] ? "rising" : "stable";
  return { currentTrustedPrice, average30Day, average90Day, recentLow, recentHigh, trend, verdict: currentTrustedPrice !== null && average90Day !== null && currentTrustedPrice <= average90Day ? "Good time to buy" : "Watch for a better price", isDemo: true };
}
