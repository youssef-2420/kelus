import { recomputeConceptCache, withCachedState } from "../domain/learner-model";
import type { LearnerSnapshot, LearningEvent } from "../domain/types";

const DAY = 86_400_000;

function iso(now: number, daysAgo = 0) {
  return new Date(now - daysAgo * DAY).toISOString();
}

function id(prefix: string) {
  return prefix;
}

export function createDemoSnapshot(nowMs = Date.now()): LearnerSnapshot {
  const now = iso(nowMs);
  const userId = "user-amina";
  const courseId = "course-marketing";
  const examId = "exam-midterm";

  const concepts = [
    { id: "c-positioning", name: "Positioning", importance: 0.9, difficulty: 0.35, seed: 0.9, lastSuccessDays: 2, extra: [] as Array<{ daysAgo: number; outcome: "success" | "partial" | "failure" }> },
    { id: "c-segmentation", name: "Segmentation", importance: 0.8, difficulty: 0.4, seed: 0.84, lastSuccessDays: 4, extra: [{ daysAgo: 4, outcome: "success" as const }] },
    { id: "c-consumer", name: "Consumer behavior", importance: 0.75, difficulty: 0.5, seed: 0.72, lastSuccessDays: 9, extra: [{ daysAgo: 12, outcome: "partial" as const }] },
    { id: "c-pricing", name: "Pricing", importance: 0.85, difficulty: 0.55, seed: 0.58, lastSuccessDays: 14, extra: [{ daysAgo: 14, outcome: "failure" as const }, { daysAgo: 8, outcome: "partial" as const }] },
    { id: "c-attribution", name: "Attribution", importance: 0.7, difficulty: 0.7, seed: 0.38, lastSuccessDays: 16, extra: [{ daysAgo: 16, outcome: "failure" as const }] },
    { id: "c-elasticity", name: "Price elasticity of demand", importance: 0.8, difficulty: 0.6, seed: 0.22, lastSuccessDays: 18, extra: [{ daysAgo: 18, outcome: "failure" as const }] },
    { id: "c-brand-equity", name: "Brand equity", importance: 0.55, difficulty: 0.45, seed: 0, lastSuccessDays: 0, extra: [] },
  ];

  const events: LearningEvent[] = [];
  const conceptRows = concepts.map((item, index) => {
    const createdAt = iso(nowMs, 40 - index);
    if (item.seed > 0) {
      events.push({
        id: id(`evt-seed-${item.id}`),
        userId,
        conceptId: item.id,
        sessionId: null,
        kind: "seed_rating",
        outcome: item.seed >= 0.75 ? "success" : item.seed >= 0.4 ? "partial" : "failure",
        promptId: null,
        responseText: null,
        masteryBefore: 0,
        masteryAfter: item.seed,
        createdAt: iso(nowMs, 30),
      });
    }
    item.extra.forEach((attempt, attemptIndex) => {
      events.push({
        id: id(`evt-${item.id}-${attemptIndex}`),
        userId,
        conceptId: item.id,
        sessionId: "session-prior",
        kind: "retrieval",
        outcome: attempt.outcome,
        promptId: `p-${item.id}`,
        responseText: null,
        masteryBefore: item.seed,
        masteryAfter: item.seed,
        createdAt: iso(nowMs, attempt.daysAgo),
      });
    });
    const base = {
      id: item.id,
      courseId,
      userId,
      name: item.name,
      importance: item.importance,
      difficulty: item.difficulty,
      mastery: 0,
      confidence: 0,
      predictedRetention: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      retrievalAttempts: 0,
      successfulRetrievals: 0,
      failedRetrievals: 0,
      createdAt,
      updatedAt: now,
    };
    return withCachedState(base, recomputeConceptCache(base, events, now));
  });

  const prompts = [
    { id: "p-c-positioning", conceptId: "c-positioning", promptText: "What is positioning in a marketing strategy?", modelAnswer: "How a product is framed in the customer’s mind relative to alternatives — the distinct value it occupies." },
    { id: "p-c-segmentation", conceptId: "c-segmentation", promptText: "What is market segmentation?", modelAnswer: "Dividing a market into groups that share needs or behaviors so the offer and message can be specific." },
    { id: "p-c-consumer", conceptId: "c-consumer", promptText: "Name one factor that shapes consumer behavior.", modelAnswer: "Motivation, perception, social influence, or the buying situation — any of these can change the choice." },
    { id: "p-c-pricing", conceptId: "c-pricing", promptText: "What should a price communicate besides cost recovery?", modelAnswer: "Perceived value, competitive stance, and who the product is for." },
    { id: "p-c-attribution", conceptId: "c-attribution", promptText: "What is marketing attribution trying to answer?", modelAnswer: "Which touchpoints deserve credit for a conversion, so spend can follow what actually influenced the decision." },
    { id: "p-c-elasticity", conceptId: "c-elasticity", promptText: "What is price elasticity of demand?", modelAnswer: "How much quantity demanded changes when price changes. Elastic demand moves a lot; inelastic demand barely moves." },
    { id: "p-c-brand-equity", conceptId: "c-brand-equity", promptText: "What is brand equity?", modelAnswer: "The extra value a brand name adds beyond the functional product — preference, pricing power, and trust." },
  ];

  return {
    profile: { id: userId, displayName: "Amina", timezone: "America/New_York", createdAt: iso(nowMs, 40) },
    courses: [{ id: courseId, userId, name: "Marketing Strategy", createdAt: iso(nowMs, 40) }],
    exams: [{
      id: examId,
      courseId,
      userId,
      target: "Midterm",
      examDate: iso(nowMs, -18),
      isActive: true,
    }],
    concepts: conceptRows,
    relationships: [
      { id: "r1", fromId: "c-positioning", toId: "c-pricing", kind: "prerequisite" },
      { id: "r2", fromId: "c-pricing", toId: "c-elasticity", kind: "prerequisite" },
      { id: "r3", fromId: "c-segmentation", toId: "c-positioning", kind: "related" },
      { id: "r4", fromId: "c-consumer", toId: "c-attribution", kind: "related" },
    ],
    prompts,
    events,
    sessions: [],
  };
}
