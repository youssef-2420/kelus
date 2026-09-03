export type ConceptStatus = "not_learned" | "weak" | "fading" | "stable" | "strong";
export type RetrievalOutcome = "success" | "partial" | "failure";
export type RelationshipKind = "prerequisite" | "related";
export type SessionStatus = "in_progress" | "complete";
export type EventKind = "seed_rating" | "retrieval";

export type Profile = {
  id: string;
  displayName: string;
  timezone: string;
  createdAt: string;
};

export type Course = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type Exam = {
  id: string;
  courseId: string;
  userId: string;
  target: string;
  examDate: string;
  isActive: boolean;
};

export type Concept = {
  id: string;
  courseId: string;
  userId: string;
  name: string;
  importance: number;
  difficulty: number;
  mastery: number;
  confidence: number;
  predictedRetention: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  retrievalAttempts: number;
  successfulRetrievals: number;
  failedRetrievals: number;
  createdAt: string;
  updatedAt: string;
};

export type ConceptRelationship = {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
};

export type Prompt = {
  id: string;
  conceptId: string;
  promptText: string;
  modelAnswer: string;
};

export type LearningEvent = {
  id: string;
  userId: string;
  conceptId: string;
  sessionId: string | null;
  kind: EventKind;
  outcome: RetrievalOutcome;
  promptId: string | null;
  responseText: string | null;
  masteryBefore: number;
  masteryAfter: number;
  createdAt: string;
};

export type StudySession = {
  id: string;
  userId: string;
  courseId: string;
  examId: string;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number;
  plannedConceptIds: string[];
  status: SessionStatus;
  summary: SessionSummary | null;
};

export type SessionSummary = {
  masteryGained: number;
  strengthenedIds: string[];
  stillWeakIds: string[];
};

export type LearnerSnapshot = {
  profile: Profile;
  courses: Course[];
  exams: Exam[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  prompts: Prompt[];
  events: LearningEvent[];
  sessions: StudySession[];
};
