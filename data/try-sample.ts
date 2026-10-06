import { buildPractice } from "@/domain/content-engine";
import { buildQuickRun, type QuickRun } from "@/domain/quick-run";
import type { LearningActivity } from "@/domain/types";

/** A short page of lecture notes, so a visitor can feel the real loop before adding anything of their own. */
export const SAMPLE_NAME = "Price elasticity of demand";
export const SAMPLE_LOCATOR = "Lecture 3, page 2";
export const SAMPLE_PAGE = [
  "Price elasticity of demand measures how strongly the quantity demanded responds to a change in price.",
  "Demand is elastic when buyers react strongly to a price change, and inelastic when they barely react.",
  "Close substitutes make demand more elastic because buyers can switch when the price rises.",
  "Necessities such as medicine usually have inelastic demand because there are few substitutes.",
  "Over a longer time horizon, demand becomes more elastic because buyers have time to adjust.",
  "When demand is inelastic, a price rise increases total revenue for the seller.",
].join("\n");

export function buildSampleRun(round = 0): QuickRun | null {
  const practice = buildPractice({
    conceptId: "try-elasticity",
    name: SAMPLE_NAME,
    excerpt: SAMPLE_PAGE,
    locator: SAMPLE_LOCATOR,
    siblingNames: ["Supply and demand", "Consumer surplus", "Market equilibrium"],
  });
  const activity = {
    id: "try-activity",
    conceptId: "try-elasticity",
    practice,
    learn: { title: SAMPLE_NAME, explanation: SAMPLE_PAGE, keyPoints: [] },
    retrieve: {
      prompt: "Why does having a close substitute make demand more elastic?",
      hint: "Think about what a buyer can do when the price rises.",
      explanation: "Buyers can switch.",
      example: "",
      modelAnswer: "Close substitutes make demand more elastic because buyers can switch when the price rises.",
    },
    apply: { prompt: "", hint: "", modelAnswer: "" },
    sourceReferences: [{ materialId: "sample", label: "Sample notes", locator: SAMPLE_LOCATOR }],
  } as unknown as LearningActivity;
  return buildQuickRun({ activity, name: SAMPLE_NAME, siblingNames: [], round });
}
