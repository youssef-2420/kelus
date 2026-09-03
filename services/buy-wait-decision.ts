import type { PriceContext } from "@/types/kelus";

export type BuyWaitDecision = {
  label: "BUY NOW" | "FAIR PRICE" | "CONSIDER WAITING" | "HISTORY BUILDING";
  explanation: string;
};

const percent = (value: number) => Math.round(Math.abs(value) * 100);

export function getBuyWaitDecision(context: PriceContext): BuyWaitDecision {
  const current = context.currentTrustedPrice;
  const average = context.average30Day;
  const low = context.recentLow;
  if (context.historyStatus !== "ready" || current === null || average === null || low === null || average <= 0 || low <= 0) {
    const logged = context.observationDayCount;
    const need = 7;
    return {
      label: "HISTORY BUILDING",
      explanation: logged > 0
        ? `Kelus has collected real comparable prices on ${logged} of ${need} required days for this exact configuration.`
        : "Kelus has not stored enough real price history for this exact configuration yet. Track this product to help build buy/wait guidance.",
    };
  }

  const versusAverage = (current - average) / average;
  const versusLow = (current - low) / low;
  if (versusAverage <= -0.03 && versusLow <= 0.03) {
    return {
      label: "BUY NOW",
      explanation: `The current comparable price is ${percent(versusAverage)}% below the 30-day average and within ${percent(versusLow)}% of the recent low.`,
    };
  }

  if (versusAverage >= 0.05 || versusLow >= 0.1) {
    return {
      label: "CONSIDER WAITING",
      explanation: `The current comparable price is ${percent(versusAverage)}% ${versusAverage >= 0 ? "above" : "below"} the 30-day average and ${percent(versusLow)}% above the recent low.`,
    };
  }

  return {
    label: "FAIR PRICE",
    explanation: `The current comparable price is ${percent(versusAverage)}% ${versusAverage >= 0 ? "above" : "below"} the 30-day average and ${percent(versusLow)}% above the recent low.`,
  };
}
