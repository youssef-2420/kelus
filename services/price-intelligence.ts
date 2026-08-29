import type { ConditionFilter, PriceContext, PriceObservation } from "@/types/kelus";

const dayMs = 86_400_000;
const minimum30DaySamples = 7;
const minimum30DaySpan = 6;
const minimum90DaySamples = 30;
const minimum90DaySpan = 60;

export const priceIntelligenceRequirements = {
  currentBest: "1 latest real observation with known item price and shipping",
  average30Day: `${minimum30DaySamples} distinct days spanning at least ${minimum30DaySpan} days`,
  average90Day: `${minimum90DaySamples} distinct days spanning at least ${minimum90DaySpan} days`,
  recentLow: "Same minimum as the 30-day average",
  trend: "Same minimum as the 30-day average; compares the earliest and latest 3 daily best prices",
  verdict: "Same minimum as the 30-day average",
} as const;

type PriceIntelligenceInput = {
  variantId: string;
  condition: ConditionFilter;
};

type Snapshot = { timestamp: number; total: number };
type DailyPrice = { day: string; timestamp: number; total: number };

const currency = (value: number) => Math.round(value * 100) / 100;
const average = (values: number[]) => values.length ? currency(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

function validTotal(observation: PriceObservation) {
  if (observation.shippingCost === null || observation.shippingCost === undefined) return null;
  if (!Number.isFinite(observation.price) || !Number.isFinite(observation.shippingCost)) return null;
  if (observation.price < 0 || observation.shippingCost < 0) return null;
  return currency(observation.price + observation.shippingCost);
}

export function exactRealPriceObservations(observations: PriceObservation[], input: PriceIntelligenceInput) {
  return observations.filter((observation) => {
    if (observation.isDemo || observation.variantId !== input.variantId) return false;
    if (input.condition !== "any" && observation.condition !== input.condition) return false;
    return validTotal(observation) !== null && !Number.isNaN(Date.parse(observation.timestamp));
  });
}

function snapshots(observations: PriceObservation[]) {
  const bestByTimestamp = new Map<number, number>();
  observations.forEach((observation) => {
    const timestamp = Date.parse(observation.timestamp);
    const total = validTotal(observation)!;
    bestByTimestamp.set(timestamp, Math.min(bestByTimestamp.get(timestamp) ?? Number.POSITIVE_INFINITY, total));
  });
  return [...bestByTimestamp.entries()]
    .map(([timestamp, total]): Snapshot => ({ timestamp, total }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function dailyBest(values: Snapshot[]) {
  const bestByDay = new Map<string, DailyPrice>();
  values.forEach((value) => {
    const day = new Date(value.timestamp).toISOString().slice(0, 10);
    const current = bestByDay.get(day);
    if (!current || value.total < current.total || (value.total === current.total && value.timestamp > current.timestamp)) {
      bestByDay.set(day, { day, timestamp: value.timestamp, total: value.total });
    }
  });
  return [...bestByDay.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function hasCoverage(values: DailyPrice[], minimumSamples: number, minimumSpanDays: number) {
  if (values.length < minimumSamples) return false;
  return (values.at(-1)!.timestamp - values[0].timestamp) / dayMs >= minimumSpanDays;
}

function trendFor(values: DailyPrice[]): PriceContext["trend"] {
  const first = average(values.slice(0, 3).map((value) => value.total))!;
  const last = average(values.slice(-3).map((value) => value.total))!;
  const movement = (last - first) / first;
  return movement <= -0.01 ? "falling" : movement >= 0.01 ? "rising" : "stable";
}

function verdictFor(current: number, typical: number): PriceContext["verdict"] {
  const ratio = current / typical;
  if (ratio <= 0.9) return "Great price";
  if (ratio <= 0.97) return "Good price";
  if (ratio < 1.05) return "Typical";
  return "Expensive";
}

export function calculatePriceIntelligence(observations: PriceObservation[], input: PriceIntelligenceInput): PriceContext {
  const exact = exactRealPriceObservations(observations, input);
  const observedSnapshots = snapshots(exact);
  if (!observedSnapshots.length) {
    return { currentTrustedPrice: null, average30Day: null, average90Day: null, recentLow: null, recentHigh: null, trend: "stable", verdict: "Price history is building", isDemo: false, historyStatus: "building", observationCount: 0 };
  }

  const latest = observedSnapshots.at(-1)!;
  const daily = dailyBest(observedSnapshots);
  const last30 = daily.filter((value) => value.timestamp >= latest.timestamp - 30 * dayMs);
  const last90 = daily.filter((value) => value.timestamp >= latest.timestamp - 90 * dayMs);
  const ready30 = hasCoverage(last30, minimum30DaySamples, minimum30DaySpan);
  const ready90 = hasCoverage(last90, minimum90DaySamples, minimum90DaySpan);

  if (!ready30) {
    return { currentTrustedPrice: latest.total, average30Day: null, average90Day: null, recentLow: null, recentHigh: null, trend: "stable", verdict: "Price history is building", isDemo: false, historyStatus: "building", observationCount: exact.length };
  }

  const totals30 = last30.map((value) => value.total);
  const average30Day = average(totals30)!;
  return {
    currentTrustedPrice: latest.total,
    average30Day,
    average90Day: ready90 ? average(last90.map((value) => value.total)) : null,
    recentLow: Math.min(...totals30),
    recentHigh: Math.max(...totals30),
    trend: trendFor(last30),
    verdict: verdictFor(latest.total, average30Day),
    isDemo: false,
    historyStatus: "ready",
    observationCount: exact.length,
  };
}
