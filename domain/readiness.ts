import type { Concept } from "./types";

export function estimatedReadiness(concepts: Concept[]) {
  if (!concepts.length) return 0;
  const totalWeight = concepts.reduce((sum, concept) => sum + concept.examImportance, 0);
  if (totalWeight <= 0) return 0;
  return concepts.reduce((sum, concept) => sum + concept.mastery * concept.examImportance, 0) / totalWeight;
}

export function readinessConfidence(concepts: Concept[]) {
  if (!concepts.length) return 0;
  return concepts.reduce((sum, concept) => sum + concept.confidence, 0) / concepts.length;
}
