import { recomputeConceptCache, withCachedState } from "../domain/learner-model";
import type { Concept, LearnerSnapshot, LearningEvent, RetrievalOutcome } from "../domain/types";
import { createDemoLearningActivities } from "./demo-learning-activities";

const DAY = 86_400_000;
const iso = (now: number, daysAgo = 0) => new Date(now - daysAgo * DAY).toISOString();

type SeedConcept = {
  id: string;
  name: string;
  examImportance: number;
  difficulty: number;
  estimatedMinutes: number;
  mastery: number;
  lastReviewedDays: number;
  history: RetrievalOutcome[];
};

const MICROECONOMICS_CONCEPTS: SeedConcept[] = [
  { id: "c-supply-demand", name: "Supply & Demand", examImportance: 0.88, difficulty: 0.38, estimatedMinutes: 22, mastery: 0.82, lastReviewedDays: 2, history: ["success", "success", "partial"] },
  { id: "c-elasticity", name: "Elasticity", examImportance: 0.95, difficulty: 0.56, estimatedMinutes: 18, mastery: 0.48, lastReviewedDays: 8, history: ["partial", "failure"] },
  { id: "c-consumer-choice", name: "Consumer Choice", examImportance: 0.68, difficulty: 0.62, estimatedMinutes: 24, mastery: 0.64, lastReviewedDays: 4, history: ["success", "partial"] },
  { id: "c-market-structures", name: "Market Structures", examImportance: 0.86, difficulty: 0.6, estimatedMinutes: 20, mastery: 0.61, lastReviewedDays: 6, history: ["partial", "success"] },
  { id: "c-game-theory", name: "Game Theory", examImportance: 0.25, difficulty: 0.7, estimatedMinutes: 26, mastery: 0.31, lastReviewedDays: 3, history: ["partial"] },
  { id: "c-monetary-policy", name: "Monetary Policy", examImportance: 0.82, difficulty: 0.58, estimatedMinutes: 18, mastery: 0.57, lastReviewedDays: 12, history: ["success", "failure"] },
  { id: "c-fiscal-policy", name: "Fiscal Policy", examImportance: 0.72, difficulty: 0.5, estimatedMinutes: 17, mastery: 0.69, lastReviewedDays: 5, history: ["success", "partial"] },
];

const PROMPTS = {
  "c-supply-demand": ["What happens to equilibrium price when demand rises and supply is unchanged?", "Price rises as buyers compete for unchanged supply, moving the market to a new equilibrium."],
  "c-elasticity": ["Why does demand become more elastic when close substitutes exist?", "Buyers can switch when price rises, so quantity demanded responds more strongly to the price change."],
  "c-consumer-choice": ["What does the budget constraint represent?", "The combinations of goods a consumer can afford at given prices and income."],
  "c-market-structures": ["What feature most clearly separates perfect competition from monopoly?", "The degree of market power: competitive firms are price takers, while a monopolist can influence price."],
  "c-game-theory": ["What is a dominant strategy?", "A strategy that gives a player the best outcome regardless of what the other player chooses."],
  "c-monetary-policy": ["How can a higher policy interest rate reduce inflationary pressure?", "It raises borrowing costs, restrains demand and investment, and can reduce upward pressure on prices."],
  "c-fiscal-policy": ["Name one expansionary fiscal-policy action.", "Increasing government spending or reducing taxes to raise aggregate demand."],
} as const;

export function createDemoSnapshot(nowMs = Date.now()): LearnerSnapshot {
  const now = iso(nowMs);
  const userId = "user-amina";
  const courseId = "course-microeconomics";
  const examId = "exam-microeconomics-final";
  const events: LearningEvent[] = [];

  const concepts = MICROECONOMICS_CONCEPTS.map((item, conceptIndex) => {
    events.push({
      id: `evt-seed-${item.id}`, userId, conceptId: item.id, sessionId: null,
      kind: "seed_rating", outcome: item.mastery >= 0.7 ? "success" : item.mastery >= 0.4 ? "partial" : "failure",
      selfRating: null, assistance: "none", responseTimeMs: null, promptId: null, responseText: null,
      masteryBefore: 0, masteryAfter: item.mastery,
      createdAt: iso(nowMs, item.lastReviewedDays + item.history.length + 2),
    });
    item.history.forEach((outcome, index) => events.push({
      id: `evt-history-${item.id}-${index}`, userId, conceptId: item.id, sessionId: "session-prior",
      kind: "retrieval", outcome, selfRating: null, assistance: "none", responseTimeMs: 20_000 + conceptIndex * 1_000,
      promptId: `p-${item.id}`, responseText: null, masteryBefore: item.mastery, masteryAfter: item.mastery,
      createdAt: iso(nowMs, item.lastReviewedDays + item.history.length - index - 1),
    }));
    const base: Concept = {
      id: item.id, courseId, userId, name: item.name, examImportance: item.examImportance,
      difficulty: item.difficulty, estimatedMinutes: item.estimatedMinutes,
      mastery: 0, confidence: 0, predictedRetention: 0, lastReviewedAt: null, nextReviewAt: null,
      retrievalAttempts: 0, successfulRetrievals: 0, failedRetrievals: 0,
      createdAt: iso(nowMs, 40), updatedAt: now,
    };
    return withCachedState(base, recomputeConceptCache(base, events, now));
  });

  return {
    profile: { id: userId, displayName: "Amina", timezone: "Africa/Casablanca", createdAt: iso(nowMs, 40) },
    courses: [{ id: courseId, userId, name: "Microeconomics", createdAt: iso(nowMs, 40) }],
    exams: [{ id: examId, courseId, userId, target: "Microeconomics Final", targetPercent: 85, examDate: iso(nowMs, -9), availableMinutes: 43, isActive: true }],
    concepts,
    relationships: [
      { id: "r-supply-elasticity", fromId: "c-supply-demand", toId: "c-elasticity", kind: "prerequisite" },
      { id: "r-elasticity-markets", fromId: "c-elasticity", toId: "c-market-structures", kind: "prerequisite" },
      { id: "r-choice-markets", fromId: "c-consumer-choice", toId: "c-market-structures", kind: "related" },
      { id: "r-monetary-fiscal", fromId: "c-monetary-policy", toId: "c-fiscal-policy", kind: "related" },
    ],
    prompts: concepts.map((concept) => ({
      id: `p-${concept.id}`,
      conceptId: concept.id,
      promptText: PROMPTS[concept.id as keyof typeof PROMPTS][0],
      modelAnswer: PROMPTS[concept.id as keyof typeof PROMPTS][1],
    })),
    learningActivities: createDemoLearningActivities(),
    events,
    sessions: [],
  };
}
