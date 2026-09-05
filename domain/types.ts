export type ConceptStatus = "not_learned" | "weak" | "fading" | "stable" | "strong";
export type RetrievalOutcome = "success" | "partial" | "failure";
export type SelfRating = "dont_know" | "weak" | "okay" | "strong";
export type RelationshipKind = "prerequisite" | "related";
export type MaterialKind = "pdf" | "video" | "link";
export type MaterialStorage = "local" | "url";
export type MaterialRole = "syllabus" | "lecture_slides" | "notes" | "past_exam" | "course_outline" | "other";
export type MaterialProcessingStatus = "saved" | "processing" | "ready" | "failed";
export type SessionStatus = "in_progress" | "complete";
export type EventKind = "seed_rating" | "self_rating" | "retrieval" | "hint_used" | "answer_revealed";
export type AssistanceLevel = "none" | "hint" | "answer_revealed";
export type LearningReasonCode =
  | "HIGH_EXAM_VALUE"
  | "LOW_MASTERY"
  | "RETENTION_FADING"
  | "PREREQUISITE_GAP"
  | "EXAM_APPROACHING"
  | "HIGH_EXPECTED_GAIN"
  | "REVIEW_DUE"
  | "LOW_CONFIDENCE_ESTIMATE";

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

export type CourseMaterial = {
  id: string;
  courseId: string;
  kind: MaterialKind;
  storage: MaterialStorage;
  title: string;
  sourceUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  role: MaterialRole;
  processingStatus: MaterialProcessingStatus;
  addedAt: string;
};

export type Exam = {
  id: string;
  courseId: string;
  userId: string;
  target: string;
  targetPercent: number;
  examDate: string;
  availableMinutes: number;
  isActive: boolean;
};

export type Concept = {
  id: string;
  courseId: string;
  userId: string;
  name: string;
  examImportance: number;
  difficulty: number;
  estimatedMinutes: number;
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

export type LearningSourceReference = {
  materialId: string;
  label: string;
  locator: string | null;
};

export type LearningActivity = {
  id: string;
  conceptId: string;
  learn: {
    title: string;
    explanation: string;
    keyPoints: string[];
  };
  retrieve: {
    prompt: string;
    hint: string;
    explanation: string;
    example: string;
    modelAnswer: string;
  };
  apply: {
    prompt: string;
    hint: string;
    modelAnswer: string;
  };
  sourceReferences: LearningSourceReference[];
};

export type LearningEvent = {
  id: string;
  userId: string;
  conceptId: string;
  sessionId: string | null;
  kind: EventKind;
  outcome: RetrievalOutcome | null;
  selfRating: SelfRating | null;
  assistance: AssistanceLevel;
  responseTimeMs: number | null;
  promptId: string | null;
  responseText: string | null;
  masteryBefore: number;
  masteryAfter: number;
  createdAt: string;
};

export type LearningValue = {
  conceptId: string;
  score: number;
  expectedGain: number;
  timeCost: number;
  reasons: LearningReasonCode[];
  confidence: number;
};

export type RouteAllocation = {
  conceptId: string | "mixed-retrieval";
  minutes: number;
  learningValue: number;
  reasons: LearningReasonCode[];
};

export type RoutePlan = {
  generatedAt: string;
  availableMinutes: number;
  allocations: RouteAllocation[];
};

export type RouteChange = {
  meaningful: boolean;
  movedConceptId: string | null;
  previousIndex: number | null;
  nextIndex: number | null;
  explanation: string | null;
};

export type StudySession = {
  id: string;
  userId: string;
  courseId: string;
  examId: string;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number;
  readinessBefore: number;
  plannedConceptIds: string[];
  initialRoute: RoutePlan;
  latestRoute: RoutePlan;
  routeChanges: RouteChange[];
  status: SessionStatus;
  summary: SessionSummary | null;
};

export type SessionSummary = {
  masteryGained: number;
  strengthenedIds: string[];
  stillWeakIds: string[];
  readinessBefore: number;
  readinessAfter: number;
};

export type LearnerSnapshot = {
  profile: Profile;
  courses: Course[];
  exams: Exam[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  prompts: Prompt[];
  learningActivities: LearningActivity[];
  events: LearningEvent[];
  sessions: StudySession[];
};
