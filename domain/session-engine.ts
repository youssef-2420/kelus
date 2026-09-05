import { applyRetrievalMastery } from "./learner-model";
import { compareRoutes, generateRoute } from "./routing-engine";
import type { Concept, LearnerSnapshot, LearningEvent, RetrievalOutcome, RouteChange, StudySession } from "./types";

export function masteryAfterEvidence(concept: Concept, outcome: RetrievalOutcome) {
  return applyRetrievalMastery(concept.mastery, outcome, concept.difficulty, concept.successfulRetrievals);
}

export function recalculateSessionRoute(input: {
  snapshot: LearnerSnapshot;
  session: StudySession;
  previousRoute: StudySession["latestRoute"];
  nowIso: string;
}) {
  const exam = input.snapshot.exams.find((item) => item.id === input.session.examId);
  if (!exam) return { route: input.previousRoute, change: null as RouteChange | null };
  const route = generateRoute({
    concepts: input.snapshot.concepts.filter((concept) => concept.courseId === input.session.courseId),
    relationships: input.snapshot.relationships,
    events: input.snapshot.events,
    exam,
    nowIso: input.nowIso,
    availableMinutes: input.previousRoute.availableMinutes,
  });
  return { route, change: compareRoutes(input.previousRoute, route) };
}

export function evidenceEvent(input: {
  id: string;
  userId: string;
  concept: Concept;
  sessionId: string | null;
  promptId: string | null;
  responseText: string | null;
  outcome: RetrievalOutcome;
  responseTimeMs: number | null;
  answerRevealed: boolean;
  createdAt: string;
}): LearningEvent {
  return {
    id: input.id,
    userId: input.userId,
    conceptId: input.concept.id,
    sessionId: input.sessionId,
    kind: "retrieval",
    outcome: input.outcome,
    selfRating: null,
    assistance: input.answerRevealed ? "answer_revealed" : "none",
    responseTimeMs: input.responseTimeMs,
    promptId: input.promptId,
    responseText: input.responseText,
    masteryBefore: input.concept.mastery,
    masteryAfter: masteryAfterEvidence(input.concept, input.outcome),
    createdAt: input.createdAt,
  };
}
