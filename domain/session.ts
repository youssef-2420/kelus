import { applyRetrievalMastery, deriveStatus, recomputeConceptCache, withCachedState } from "./learner-model";
import { planTodaySession } from "./scheduler";
import type { Concept, LearningEvent, RetrievalOutcome, SessionSummary, StudySession } from "./types";

export function createRetrievalEvent(input: {
  id: string;
  userId: string;
  concept: Concept;
  sessionId: string;
  promptId: string;
  responseText: string;
  outcome: RetrievalOutcome;
  createdAt: string;
}): LearningEvent {
  const masteryAfter = applyRetrievalMastery(
    input.concept.mastery,
    input.outcome,
    input.concept.difficulty,
    input.concept.successfulRetrievals,
  );
  return {
    id: input.id,
    userId: input.userId,
    conceptId: input.concept.id,
    sessionId: input.sessionId,
    kind: "retrieval",
    outcome: input.outcome,
    promptId: input.promptId,
    responseText: input.responseText,
    masteryBefore: input.concept.mastery,
    masteryAfter,
    createdAt: input.createdAt,
  };
}

export function applyImmutableEvent(concept: Concept, events: LearningEvent[], nowIso: string): Concept {
  return withCachedState(concept, recomputeConceptCache(concept, events, nowIso));
}

export function sessionSummary(before: Concept[], after: Concept[]): SessionSummary {
  const byId = new Map(before.map((concept) => [concept.id, concept]));
  const strengthenedIds = after
    .filter((concept) => (byId.get(concept.id)?.mastery ?? 0) < concept.mastery - 0.01)
    .map((concept) => concept.id);
  const stillWeakIds = after
    .filter((concept) => deriveStatus(concept.mastery, concept.predictedRetention, concept.retrievalAttempts) === "weak")
    .map((concept) => concept.id);
  const masteryGained = after.reduce((total, concept) => total + (concept.mastery - (byId.get(concept.id)?.mastery ?? 0)), 0);
  return { masteryGained, strengthenedIds, stillWeakIds };
}

export function completeSession(session: StudySession, summary: SessionSummary, endedAt: string): StudySession {
  return { ...session, status: "complete", endedAt, summary };
}

export { planTodaySession };
