/**
 * MVP heuristic constants for Kelus learner model.
 * Replaceable later. Not a published memory-science model.
 */
export const ALGORITHM_KIND = "kelus-mvp-heuristic-v1" as const;

export const MASTERY_SUCCESS_GROWTH = 0.18;
export const MASTERY_PARTIAL_FACTOR = 0.45;
export const MASTERY_FAIL_MULTIPLIER = 0.65;
export const MASTERY_DIFFICULTY_WEIGHT = 0.4;
export const MASTERY_REPEAT_DAMPING = 0.12;

export const STABILITY_BASE_DAYS = 2;
export const STABILITY_MASTERY_WEIGHT = 8;

export const PRIORITY_URGENCY_DIVISOR = 7;
export const PRIORITY_WEAKNESS = 0.3;
export const PRIORITY_FORGETTING = 0.4;
export const PRIORITY_NEWNESS = 0.3;
export const PREREQ_BOOST = 1.5;
export const UNMET_PREREQ_CUT = 0.25;
export const UNMET_PREREQ_MASTERY = 0.45;

export const STATUS_WEAK_MASTERY = 0.4;
export const STATUS_WEAK_RETENTION = 0.45;
export const STATUS_FADING_MASTERY = 0.55;
export const STATUS_FADING_GAP = 0.18;
export const STATUS_STRONG_MASTERY = 0.8;
export const STATUS_STRONG_RETENTION = 0.75;

export const SESSION_WEAK_CAP = 3;
export const SESSION_FADING_CAP = 2;
export const SESSION_NEW_CAP = 2;
export const SESSION_SIZE = 7;
export const SESSION_MINUTES = 45;
export const NEXT_REVIEW_STABILITY_FRACTION = 0.5;
export const CONFIDENCE_WINDOW = 8;
export const MINUTES_PER_CONCEPT = 3.5;

/**
 * Expected-learning-value heuristic. These are product constants, not claims of
 * scientific precision. Keeping them centralized makes later calibration safe.
 */
export const LEARNING_VALUE = {
  masteryGapFloor: 0.12,
  retentionNeedFloor: 0.28,
  examValueFloor: 0.15,
  examImportanceWeight: 0.85,
  urgencyWindowDays: 28,
  urgencyFloor: 0.7,
  urgencyRange: 0.8,
  prerequisiteDependentBoost: 0.18,
  prerequisiteGapBoost: 0.3,
  recentFailureBoost: 0.22,
  recentSuccessDiscount: 0.08,
  uncertaintyBoost: 0.16,
  targetGapBoost: 0.24,
  difficultyGainPenalty: 0.28,
  reviewDueBoost: 0.16,
  scoreScale: 100,
} as const;

export const ROUTING = {
  minimumConceptMinutes: 8,
  maximumConceptMinutes: 18,
  mixedRetrievalMinutes: 5,
  maximumConceptStops: 3,
  minimumSessionMinutes: 15,
  maximumSessionMinutes: 90,
  meaningfulMovePositions: 2,
  meaningfulTopScoreDelta: 0.16,
} as const;

export const SELF_RATING_MASTERY = {
  dont_know: 0.08,
  weak: 0.32,
  okay: 0.58,
  strong: 0.78,
} as const;

export const SELF_RATING_CONFIDENCE = 0.2;
export const DIAGNOSIS_RETRIEVAL_LIMIT = 2;
