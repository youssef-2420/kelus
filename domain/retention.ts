import { predictedRetention } from "./learner-model";
import type { Concept } from "./types";

export function estimateRetention(concept: Concept, nowIso: string) {
  return predictedRetention(
    concept.mastery,
    concept.successfulRetrievals,
    concept.lastReviewedAt,
    nowIso,
  );
}

export function withCurrentRetention(concept: Concept, nowIso: string): Concept {
  return { ...concept, predictedRetention: estimateRetention(concept, nowIso) };
}
