import { buildPractice } from "./content-engine";
import { dayKey } from "./habit";
import { isDrillable } from "./practice-check";
import type { LearningEvent, PracticeItem, RetrievalOutcome } from "./types";

export type MissedLine = { conceptId: string; name: string; quote: string; at: string };

export type ReturnVisit = {
  /** True when the last answer was on an earlier day, or at least a few hours ago. */
  returning: boolean;
  daysAway: number;
  lastName: string | null;
  lastOutcome: RetrievalOutcome | null;
  /** Up to three missed lines old enough to be worth a warm-up, one per topic first. */
  warmup: MissedLine[];
};

const HOURS = 60 * 60 * 1000;
/** How long a missed line rests before it comes back: long enough that recalling it takes real effort. */
export const SPACING_MS = 4 * HOURS;
const WARMUP_SIZE = 3;

/**
 * The second visit, decided from your own answers: how long you were away, what you did last, and which missed
 * lines are ready to come back. A miss from a few minutes ago is still fresh, so it waits for a later visit.
 */
export function returnVisit(input: { events: LearningEvent[]; names: Map<string, string>; missed: MissedLine[]; nowMs: number }): ReturnVisit {
  const answers = input.events
    .filter((event) => event.kind === "retrieval" && input.names.has(event.conceptId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = answers[0];
  const lastMs = last ? Date.parse(last.createdAt) : NaN;
  const now = new Date(input.nowMs);
  const earlierDay = last ? dayKey(new Date(lastMs)) !== dayKey(now) : false;
  const returning = Boolean(last) && (earlierDay || input.nowMs - lastMs >= SPACING_MS);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const daysAway = last ? Math.max(0, Math.round((startOfToday - new Date(new Date(lastMs).getFullYear(), new Date(lastMs).getMonth(), new Date(lastMs).getDate()).getTime()) / (24 * HOURS))) : 0;

  const ready = input.missed
    .filter((line) => input.names.has(line.conceptId) && input.nowMs - Date.parse(line.at) >= SPACING_MS)
    .sort((a, b) => b.at.localeCompare(a.at));
  // Spread across topics before taking a second line from the same one.
  const warmup: MissedLine[] = [];
  for (const pass of [0, 1]) {
    for (const line of ready) {
      if (warmup.length >= WARMUP_SIZE || warmup.includes(line)) continue;
      if (pass === 0 && warmup.some((chosen) => chosen.conceptId === line.conceptId)) continue;
      warmup.push(line);
    }
  }

  return {
    returning,
    daysAway,
    lastName: last ? input.names.get(last.conceptId) ?? null : null,
    lastOutcome: last?.outcome ?? null,
    warmup: returning ? warmup.map((line) => ({ ...line, name: input.names.get(line.conceptId) ?? line.name })) : [],
  };
}

/**
 * One quick check per missed line, built from that line alone: a gap in the very sentence that was missed.
 * The quote stays exact, so getting it right is evidence about that line, not a lucky guess elsewhere.
 */
export function warmupChecks(lines: MissedLine[]): Array<{ line: MissedLine; item: PracticeItem }> {
  const out: Array<{ line: MissedLine; item: PracticeItem }> = [];
  for (const line of lines) {
    const items = buildPractice({ conceptId: line.conceptId, name: line.name, excerpt: line.quote, locator: "your notes", siblingNames: [] }).filter(isDrillable);
    const item = items.find((candidate) => candidate.kind === "cloze") ?? items[0];
    if (item) out.push({ line, item: { ...item, sourceQuote: line.quote } });
  }
  return out;
}
