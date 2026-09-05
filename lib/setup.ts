import { createDemoSnapshot } from "@/data/demo-seed";
import type { LearnerSnapshot } from "@/domain/types";

export type SetupInput = {
  examName: string;
  examDate: string;
  targetPercent: number;
  availableMinutes: number;
};

export function createLearnerSnapshot(input: SetupInput, nowMs = Date.now()): LearnerSnapshot {
  const examName = input.examName.trim();
  if (!examName) throw new Error("Tell Kelus what you are working toward.");
  const examDate = new Date(`${input.examDate}T12:00:00.000Z`);
  if (Number.isNaN(examDate.getTime()) || examDate.getTime() <= nowMs) {
    throw new Error("Choose an exam date in the future.");
  }
  if (input.targetPercent < 50 || input.targetPercent > 100) {
    throw new Error("Choose a target between 50% and 100%.");
  }
  if (![15, 30, 45, 60].includes(input.availableMinutes)) {
    throw new Error("Choose an available study time.");
  }

  const snapshot = createDemoSnapshot(nowMs);
  const now = new Date(nowMs).toISOString();
  return {
    ...snapshot,
    profile: { ...snapshot.profile, displayName: "Student", createdAt: now },
    courses: snapshot.courses.map((course) => ({ ...course, createdAt: now })),
    exams: snapshot.exams.map((exam) => ({
      ...exam,
      target: examName,
      targetPercent: input.targetPercent,
      examDate: examDate.toISOString(),
      availableMinutes: input.availableMinutes,
    })),
    concepts: snapshot.concepts.map((concept) => ({
      ...concept,
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
    })),
    events: [],
    sessions: [],
  };
}
