import { LEARNING_VALUE } from "./constants";
import { clamp01, daysBetween } from "./learner-model";
import { dependentsFor, prerequisiteGap } from "./knowledge-graph";
import type { Concept, ConceptRelationship, Exam, LearningEvent, LearningReasonCode, LearningValue } from "./types";

function daysUntil(examDate: string, nowIso: string) {
  return Math.max(0, (Date.parse(examDate) - Date.parse(nowIso)) / 86_400_000);
}

function recentPerformance(conceptId: string, events: LearningEvent[]) {
  const outcomes = events
    .filter((event) => event.conceptId === conceptId && event.kind === "retrieval" && event.outcome)
    .slice(-3)
    .map((event) => event.outcome);
  if (!outcomes.length) return 0;
  return outcomes.reduce((sum, outcome) => sum + (outcome === "failure" ? 1 : outcome === "partial" ? 0.45 : -0.35), 0) / outcomes.length;
}

export function calculateLearningValue(input: {
  concept: Concept;
  concepts: Concept[];
  relationships: ConceptRelationship[];
  events: LearningEvent[];
  exam: Exam;
  nowIso: string;
}): LearningValue {
  const { concept, concepts, relationships, events, exam, nowIso } = input;
  const masteryGap = Math.max(LEARNING_VALUE.masteryGapFloor, 1 - concept.mastery);
  const retentionNeed = Math.max(LEARNING_VALUE.retentionNeedFloor, 1 - concept.predictedRetention);
  const examValue = LEARNING_VALUE.examValueFloor + concept.examImportance * LEARNING_VALUE.examImportanceWeight;
  const days = daysUntil(exam.examDate, nowIso);
  const urgency = LEARNING_VALUE.urgencyFloor
    + LEARNING_VALUE.urgencyRange * clamp01(1 - days / LEARNING_VALUE.urgencyWindowDays);
  const dependentCount = dependentsFor(concept.id, relationships).length;
  const gap = prerequisiteGap(concept.id, concepts, relationships);
  const prerequisiteLeverage = 1
    + Math.min(0.5, dependentCount * LEARNING_VALUE.prerequisiteDependentBoost)
    + gap * LEARNING_VALUE.prerequisiteGapBoost;
  const performance = recentPerformance(concept.id, events);
  const performanceFactor = performance >= 0
    ? 1 + performance * LEARNING_VALUE.recentFailureBoost
    : 1 + performance * LEARNING_VALUE.recentSuccessDiscount;
  const uncertainty = 1 + (1 - concept.confidence) * LEARNING_VALUE.uncertaintyBoost;
  const targetPressure = 1 + Math.max(0, exam.targetPercent / 100 - concept.mastery) * LEARNING_VALUE.targetGapBoost;
  const reviewDue = concept.nextReviewAt && Date.parse(concept.nextReviewAt) <= Date.parse(nowIso);
  const reviewFactor = reviewDue ? 1 + LEARNING_VALUE.reviewDueBoost : 1;
  const expectedGain = masteryGap * (1 - concept.difficulty * LEARNING_VALUE.difficultyGainPenalty);
  const timeCost = Math.max(1, concept.estimatedMinutes);
  const score = LEARNING_VALUE.scoreScale
    * expectedGain
    * examValue
    * urgency
    * retentionNeed
    * prerequisiteLeverage
    * performanceFactor
    * uncertainty
    * targetPressure
    * reviewFactor
    / timeCost;

  const reasons: LearningReasonCode[] = [];
  if (concept.examImportance >= 0.82) reasons.push("HIGH_EXAM_VALUE");
  if (concept.mastery < 0.55) reasons.push("LOW_MASTERY");
  if (concept.predictedRetention < Math.max(0.6, concept.mastery - 0.1)) reasons.push("RETENTION_FADING");
  if (dependentCount > 0 || gap > 0.25) reasons.push("PREREQUISITE_GAP");
  if (days <= 14) reasons.push("EXAM_APPROACHING");
  if (expectedGain >= 0.35) reasons.push("HIGH_EXPECTED_GAIN");
  if (reviewDue) reasons.push("REVIEW_DUE");
  if (concept.confidence < 0.45) reasons.push("LOW_CONFIDENCE_ESTIMATE");

  return {
    conceptId: concept.id,
    score,
    expectedGain,
    timeCost,
    reasons,
    confidence: clamp01(concept.confidence),
  };
}

export function wasReviewedRecently(concept: Concept, nowIso: string) {
  return concept.lastReviewedAt ? daysBetween(concept.lastReviewedAt, nowIso) < 1 : false;
}
