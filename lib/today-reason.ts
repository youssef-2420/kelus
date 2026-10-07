import type { Concept, RouteAllocation } from "@/domain/types";

/** Plain-language evidence for a route choice, without claiming a predicted grade. */
export function describeRouteChoice(allocation: RouteAllocation, concept?: Concept): string[] {
  if (!concept) return ["A short mixed-recall block: a few topics at once, from memory."];

  const reasons = new Set(allocation.reasons);
  const lines: string[] = [];

  if (concept.retrievalAttempts === 0) {
    lines.push("New to you here: no answers on it yet.");
  } else if (reasons.has("LOW_MASTERY")) {
    lines.push("Your last answers here were shaky.");
  } else if (reasons.has("REVIEW_DUE") || reasons.has("RETENTION_FADING")) {
    lines.push("Time to check you still remember it.");
  } else if (reasons.has("LOW_CONFIDENCE_ESTIMATE")) {
    lines.push("A few more answers will show where you stand.");
  }

  if (reasons.has("PREREQUISITE_GAP")) {
    lines.push("It helps with the topics that build on it.");
  } else if (reasons.has("HIGH_EXAM_VALUE")) {
    lines.push("It carries more weight in your exam.");
  } else if (reasons.has("EXAM_APPROACHING")) {
    lines.push("Your exam is close.");
  }

  return lines.length ? lines.slice(0, 2) : ["Next in your plan."];
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
