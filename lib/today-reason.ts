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

/** A student-facing payoff for the next focused block, without promising grades. */
export function describeRoutePayoff(
  allocation: RouteAllocation,
  nextTopic?: string,
): string {
  const reasons = new Set(allocation.reasons);
  if (reasons.has("PREREQUISITE_GAP") && nextTopic) {
    return `A focused pass here should make ${nextTopic} easier to retrieve next.`;
  }
  if (reasons.has("HIGH_EXAM_VALUE")) {
    return "A focused pass gives you stronger evidence on a high-value exam topic.";
  }
  if (reasons.has("REVIEW_DUE") || reasons.has("RETENTION_FADING")) {
    return "A short recall now helps keep this idea available before it fades.";
  }
  if (reasons.has("LOW_MASTERY") || reasons.has("LOW_CONFIDENCE_ESTIMATE")) {
    return "One focused pass can turn an uncertain answer into a clearer next decision.";
  }
  return "This block gives Kelus better evidence about what you can use from memory.";
}
