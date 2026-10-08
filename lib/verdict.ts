import type { RetrievalOutcome } from "@/domain/types";
import type { SelfGrade } from "@/domain/quick-run";

export type QuickStats = { right: number; total: number; unsure: number; self: SelfGrade };

const LINE: Record<RetrievalOutcome, string> = {
  success: "You knew it and you could say it.",
  partial: "Some of it is solid. One more look will fix the rest.",
  failure: "That is what practice is for. Now you know what to read again.",
};

/**
 * Why this verdict, in one sentence: the checks and your own rating each count for half, so a "Partly" with no
 * check right is still another attempt. Saying so stops the verdict from seeming to contradict "You said".
 */
export function verdictReason(outcome: RetrievalOutcome, stats: QuickStats | null) {
  if (!stats || stats.total === 0) return LINE[outcome];
  const checks = `${stats.right} of ${stats.total} check${stats.total === 1 ? "" : "s"} right`;
  const said = stats.self === "nailed" ? "you nailed the explanation" : stats.self === "partly" ? "your explanation was partly there" : "you missed the explanation";
  if (outcome === "success") return `${checks} and ${said}. It comes back in a few days to keep it.`;
  if (outcome === "partial") return `${checks} and ${said}. It comes back soon to firm up.`;
  return `${checks}${stats.self === "missed" ? ` and ${said}` : `, so even though ${said}`}, it comes back tomorrow.`;
}
