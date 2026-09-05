import { deriveStatus, recomputeConceptCache, withCachedState } from "./learner-model";
import { evidenceEvent } from "./session-engine";
import { estimatedReadiness } from "./readiness";
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
  responseTimeMs?: number | null;
  answerRevealed?: boolean;
  createdAt: string;
}): LearningEvent {
  return evidenceEvent({ ...input, responseTimeMs: input.responseTimeMs ?? null, answerRevealed: input.answerRevealed ?? false });
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
  return {
    masteryGained,
    strengthenedIds,
    stillWeakIds,
    readinessBefore: estimatedReadiness(before),
    readinessAfter: estimatedReadiness(after),
  };
}

export function completeSession(session: StudySession, summary: SessionSummary, endedAt: string): StudySession {
  return { ...session, status: "complete", endedAt, summary };
}

export { planTodaySession };
