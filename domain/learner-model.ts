import {
  CONFIDENCE_WINDOW,
  MASTERY_DIFFICULTY_WEIGHT,
  MASTERY_FAIL_MULTIPLIER,
  MASTERY_PARTIAL_FACTOR,
  MASTERY_REPEAT_DAMPING,
  MASTERY_SUCCESS_GROWTH,
  NEXT_REVIEW_STABILITY_FRACTION,
  STATUS_FADING_GAP,
  STATUS_FADING_MASTERY,
  STATUS_STRONG_MASTERY,
  STATUS_STRONG_RETENTION,
  STATUS_WEAK_MASTERY,
  STATUS_WEAK_RETENTION,
  STABILITY_BASE_DAYS,
  STABILITY_MASTERY_WEIGHT,
} from "./constants";
import type { Concept, ConceptStatus, LearningEvent, RetrievalOutcome } from "./types";

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.max(0, (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

export function stabilityDays(mastery: number, successfulRetrievals: number) {
  return STABILITY_BASE_DAYS + STABILITY_MASTERY_WEIGHT * clamp01(mastery) * Math.log(1 + Math.max(0, successfulRetrievals));
}

export function predictedRetention(mastery: number, successfulRetrievals: number, lastSuccessAt: string | null, nowIso: string) {
  if (!lastSuccessAt) return 0;
  const stability = stabilityDays(mastery, successfulRetrievals);
  const elapsed = daysBetween(lastSuccessAt, nowIso);
  return clamp01(mastery * 2 ** (-elapsed / stability));
}

export function nextReviewAt(mastery: number, successfulRetrievals: number, lastSuccessAt: string | null, nowIso: string) {
  if (!lastSuccessAt) return nowIso;
  const days = stabilityDays(mastery, successfulRetrievals) * NEXT_REVIEW_STABILITY_FRACTION;
  return new Date(Date.parse(nowIso) + days * 86_400_000).toISOString();
}

export function deriveStatus(mastery: number, retention: number, retrievalAttempts: number): ConceptStatus {
  if (retrievalAttempts <= 0) return "not_learned";
  if (mastery < STATUS_WEAK_MASTERY || retention < STATUS_WEAK_RETENTION) return "weak";
  if (mastery >= STATUS_STRONG_MASTERY && retention >= STATUS_STRONG_RETENTION) return "strong";
  if (mastery >= STATUS_FADING_MASTERY && retention <= mastery - STATUS_FADING_GAP) return "fading";
  return "stable";
}

export function applyRetrievalMastery(mastery: number, outcome: RetrievalOutcome, difficulty: number, successfulRetrievals: number) {
  const current = clamp01(mastery);
  if (outcome === "failure") return clamp01(current * MASTERY_FAIL_MULTIPLIER);
  const growth = MASTERY_SUCCESS_GROWTH
    * (1 - MASTERY_DIFFICULTY_WEIGHT * clamp01(difficulty))
    / (1 + MASTERY_REPEAT_DAMPING * Math.max(0, successfulRetrievals));
  const scaled = outcome === "partial" ? growth * MASTERY_PARTIAL_FACTOR : growth;
  return clamp01(current + (1 - current) * scaled);
}

export function confidenceFromOutcomes(outcomes: RetrievalOutcome[]) {
  const recent = outcomes.slice(-CONFIDENCE_WINDOW);
  if (!recent.length) return 0;
  const score = recent.reduce((total, outcome) => total + (outcome === "success" ? 1 : outcome === "partial" ? 0.5 : 0), 0);
  return clamp01(score / recent.length);
}

export type ConceptCache = Pick<Concept,
  | "mastery"
  | "confidence"
  | "predictedRetention"
  | "lastReviewedAt"
  | "nextReviewAt"
  | "retrievalAttempts"
  | "successfulRetrievals"
  | "failedRetrievals"
  | "updatedAt"
>;

function eventTime(event: LearningEvent) {
  return Date.parse(event.createdAt);
}

export function recomputeConceptCache(
  concept: Pick<Concept, "id" | "difficulty">,
  events: LearningEvent[],
  nowIso: string,
): ConceptCache {
  const history = events
    .filter((event) => event.conceptId === concept.id)
    .sort((a, b) => eventTime(a) - eventTime(b) || a.id.localeCompare(b.id));

  let mastery = 0;
  let retrievalAttempts = 0;
  let successfulRetrievals = 0;
  let failedRetrievals = 0;
  let lastReviewedAt: string | null = null;
  let lastSuccessAt: string | null = null;
  const retrievalOutcomes: RetrievalOutcome[] = [];

  for (const event of history) {
    if (event.kind === "seed_rating") {
      mastery = event.masteryAfter;
      lastReviewedAt = event.createdAt;
      if (event.outcome === "success") lastSuccessAt = event.createdAt;
      continue;
    }
    mastery = applyRetrievalMastery(mastery, event.outcome, concept.difficulty, successfulRetrievals);
    retrievalAttempts += 1;
    lastReviewedAt = event.createdAt;
    retrievalOutcomes.push(event.outcome);
    if (event.outcome === "success") {
      successfulRetrievals += 1;
      lastSuccessAt = event.createdAt;
    } else if (event.outcome === "failure") {
      failedRetrievals += 1;
    } else {
      successfulRetrievals += 1;
      lastSuccessAt = event.createdAt;
    }
  }

  const retention = predictedRetention(mastery, successfulRetrievals, lastSuccessAt, nowIso);
  return {
    mastery,
    confidence: confidenceFromOutcomes(retrievalOutcomes),
    predictedRetention: retention,
    lastReviewedAt,
    nextReviewAt: nextReviewAt(mastery, successfulRetrievals, lastSuccessAt, nowIso),
    retrievalAttempts,
    successfulRetrievals,
    failedRetrievals,
    updatedAt: nowIso,
  };
}

export function withCachedState(concept: Concept, cache: ConceptCache): Concept {
  return { ...concept, ...cache };
}
