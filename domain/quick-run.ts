import { buildPractice } from "./content-engine";
import { isDrillable } from "./practice-check";
import type { LearningActivity, PracticeItem, RetrievalOutcome } from "./types";

export type SelfGrade = "nailed" | "partly" | "missed";

export type QuickRun = {
  checks: PracticeItem[];
  explainPrompt: string;
  explainAnswer: string;
  explainQuote: string;
};

const MAX_CHECKS = 3;

/**
 * A short run for one topic: up to three instant checks, then one explanation in the learner's own words.
 * Everything comes from the topic's page. Returns null when the page gives fewer than two checkable questions,
 * so the longer loop is used instead.
 */
export function buildQuickRun(input: { activity: LearningActivity; name: string; siblingNames: string[]; round?: number }): QuickRun | null {
  const { activity, name, siblingNames } = input;
  const round = Math.max(0, Math.floor(input.round ?? 0));
  const own = activity.practice?.length
    ? activity.practice
    : buildPractice({
        conceptId: activity.conceptId,
        name,
        excerpt: [activity.learn.explanation, ...activity.learn.keyPoints].join("\n"),
        locator: activity.sourceReferences[0]?.locator ?? "this page",
        siblingNames,
      });
  // One of each kind before a second of any: a run should feel varied, not repeated.
  // Each round starts further along the list, so a second session brings questions the first one did not.
  const all = own.filter(isDrillable);
  const turn = all.length ? (round * MAX_CHECKS) % all.length : 0;
  const pool = [...all.slice(turn), ...all.slice(0, turn)];
  const seen = new Set<string>();
  const style = (item: PracticeItem) => item.variant ?? item.kind;
  // A question that asks "why" or "which" beats a fill-in gap, so one understanding item leads when the page has one.
  const lead = pool.find((item) => item.level === "understand");
  if (lead) seen.add(style(lead));
  const first = pool.filter((item) => (item === lead ? false : seen.has(style(item)) ? false : (seen.add(style(item)), true)));
  const rest = pool.filter((item) => item !== lead && !first.includes(item));
  const checks = [...(lead ? [lead] : []), ...first, ...rest].slice(0, MAX_CHECKS);
  if (checks.length < 2) return null;
  return {
    checks,
    explainPrompt: round % 2 === 1 ? `Close the page. What would you tell a friend about ${name}?` : activity.retrieve.prompt,
    explainAnswer: activity.retrieve.modelAnswer,
    explainQuote: activity.retrieve.modelAnswer,
  };
}

/**
 * One outcome for the topic, from two kinds of evidence: how many quick checks were right, and how the
 * learner rated their own explanation. A strong rating cannot rescue wrong checks, and a miss caps the result.
 */
export function quickOutcome(input: { right: number; total: number; self: SelfGrade }): RetrievalOutcome {
  const share = input.total > 0 ? input.right / input.total : 0;
  const self = input.self === "nailed" ? 1 : input.self === "partly" ? 0.5 : 0;
  const score = share * 0.5 + self * 0.5;
  if (input.self === "missed" && share < 0.5) return "failure";
  if (score >= 0.75 && input.self !== "missed") return "success";
  if (score < 0.35) return "failure";
  return "partial";
}

export function quickSummary(input: { right: number; total: number; self: SelfGrade; unsure?: number }) {
  const rating = input.self === "nailed" ? "nailed it" : input.self === "partly" ? "partly there" : "missed it";
  const unsure = input.unsure ? ` (${input.unsure} marked not sure)` : "";
  return `${input.right} of ${input.total} quick checks right${unsure}. You rated your explanation: ${rating}.`;
}
