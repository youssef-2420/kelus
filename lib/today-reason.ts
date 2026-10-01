import type { Concept, RouteAllocation } from "@/domain/types";

/** Plain-language evidence for a route choice, without claiming a predicted grade. */
export function describeRouteChoice(allocation: RouteAllocation, concept?: Concept): string[] {
  if (!concept) return ["A short mixed-recall block helps check what is still available from memory."];

  const reasons = new Set(allocation.reasons);
  const lines: string[] = [];

  if (concept.retrievalAttempts === 0) {
    lines.push("You have not checked your recall on this topic in Kelus yet.");
  } else if (reasons.has("LOW_MASTERY")) {
    lines.push("Your earlier answers suggest this topic needs another pass.");
  } else if (reasons.has("REVIEW_DUE") || reasons.has("RETENTION_FADING")) {
    lines.push("It is time to check what you still remember from earlier practice.");
  } else if (reasons.has("LOW_CONFIDENCE_ESTIMATE")) {
    lines.push("Kelus needs more answer evidence before trusting its estimate here.");
  }

  if (reasons.has("PREREQUISITE_GAP")) {
    lines.push("A stronger grasp here may help with connected topics later.");
  } else if (reasons.has("HIGH_EXAM_VALUE")) {
    lines.push("Your current course model gives this topic higher exam weight.");
  } else if (reasons.has("EXAM_APPROACHING")) {
    lines.push("The exam is close, so a check now is useful.");
  }

  return lines.length ? lines.slice(0, 2) : ["Selected from your current course and study history."];
}
