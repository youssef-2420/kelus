import { recomputeConceptCache, withCachedState } from "@/domain/learner-model";
import type { LearnerSnapshot, LearningEvent } from "@/domain/types";

export type Familiarity = "new" | "familiar" | "reviewing";

export type SetupInput = {
  displayName: string;
  courseName: string;
  examName: string;
  examDate: string;
  topics: string[];
  familiarity: Familiarity;
};

const MAX_TOPICS = 16;

export function normalizeTopics(topics: string[]) {
  const seen = new Set<string>();
  return topics
    .map((topic) => topic.trim().replace(/\s+/g, " "))
    .filter((topic) => {
      const key = topic.toLocaleLowerCase();
      if (!topic || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TOPICS);
}

function familiarityMastery(familiarity: Familiarity) {
  if (familiarity === "reviewing") return 0.65;
  if (familiarity === "familiar") return 0.35;
  return 0;
}

export function createLearnerSnapshot(input: SetupInput, nowMs = Date.now()): LearnerSnapshot {
  const topics = normalizeTopics(input.topics);
  if (!input.displayName.trim() || !input.courseName.trim() || !input.examName.trim()) {
    throw new Error("Name, course, and exam are required.");
  }
  if (topics.length < 2) throw new Error("Add at least two topics.");

  const examDate = new Date(`${input.examDate}T12:00:00.000Z`);
  if (Number.isNaN(examDate.getTime()) || examDate.getTime() <= nowMs) {
    throw new Error("Choose an exam date in the future.");
  }

  const now = new Date(nowMs).toISOString();
  const token = `${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const userId = `learner-${token}`;
  const courseId = `course-${token}`;
  const examId = `exam-${token}`;
  const mastery = familiarityMastery(input.familiarity);
  const events: LearningEvent[] = [];

  const concepts = topics.map((name, index) => {
    const conceptId = `concept-${token}-${index + 1}`;
    const base = {
      id: conceptId,
      courseId,
      userId,
      name,
      importance: 0.7,
      difficulty: 0.5,
      mastery: 0,
      confidence: 0,
      predictedRetention: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
      retrievalAttempts: 0,
      successfulRetrievals: 0,
      failedRetrievals: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (mastery > 0) {
      events.push({
        id: `seed-${conceptId}`,
        userId,
        conceptId,
        sessionId: null,
        kind: "seed_rating",
        outcome: mastery >= 0.6 ? "success" : "partial",
        promptId: null,
        responseText: null,
        masteryBefore: 0,
        masteryAfter: mastery,
        createdAt: now,
      });
    }
    return withCachedState(base, recomputeConceptCache(base, events, now));
  });

  return {
    profile: {
      id: userId,
      displayName: input.displayName.trim(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      createdAt: now,
    },
    courses: [{ id: courseId, userId, name: input.courseName.trim(), createdAt: now }],
    exams: [{
      id: examId,
      courseId,
      userId,
      target: input.examName.trim(),
      examDate: examDate.toISOString(),
      isActive: true,
    }],
    concepts,
    relationships: [],
    prompts: concepts.map((concept) => ({
      id: `prompt-${concept.id}`,
      conceptId: concept.id,
      promptText: `Without notes, explain ${concept.name}. Include the central idea and one example.`,
      modelAnswer: "Check your explanation against your course material, then rate how complete your recall was.",
    })),
    events,
    sessions: [],
  };
}
