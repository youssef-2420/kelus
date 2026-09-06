import type { LearningReasonCode } from "@/domain/types";

export const REASON_COPY: Record<LearningReasonCode, string> = {
  HIGH_EXAM_VALUE: "Very important for your exam",
  LOW_MASTERY: "Your current estimate is still developing",
  RETENTION_FADING: "Recall is fading",
  PREREQUISITE_GAP: "Unlocks connected exam topics",
  EXAM_APPROACHING: "Your exam is approaching",
  HIGH_EXPECTED_GAIN: "Strong expected return on study time",
  REVIEW_DUE: "Review is due",
  LOW_CONFIDENCE_ESTIMATE: "Kelus needs stronger evidence here",
};

export function conciseReason(reasons: LearningReasonCode[]) {
  if (!reasons.length) return "Queued for this session";
  // Prefer the most distinctive signal first so rows do not all read the same.
  const preferred = reasons.find((reason) => reason !== "HIGH_EXAM_VALUE") ?? reasons[0];
  const second = reasons.find((reason) => reason !== preferred);
  return second ? `${REASON_COPY[preferred]} · ${REASON_COPY[second]}` : REASON_COPY[preferred];
}
