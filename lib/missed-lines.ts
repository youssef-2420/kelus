/**
 * The lines from your notes that you missed in a run, so the next visit can start with them. They live in the
 * learner state: on this device, and in your account when you sign in. A line leaves the list once you get it
 * right in a warm-up.
 */

import type { MissedLine } from "@/domain/return-visit";
import { getDemoSnapshot, subscribeDemoState, updateMissedLines } from "@/lib/demo-store";

export type { MissedLine };

const LEGACY_KEY = "kelus-missed-lines-v1";
const EMPTY: MissedLine[] = [];
let migrated = false;

/** Lines saved by the first version, in their own browser key, move into the learner state once. */
function migrateLegacy() {
  if (migrated || typeof window === "undefined") return;
  migrated = true;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    window.localStorage.removeItem(LEGACY_KEY);
    const old = JSON.parse(raw);
    if (Array.isArray(old) && old.length) {
      const lines = old.filter((line) => line && typeof line.quote === "string" && typeof line.at === "string");
      queueMicrotask(() => updateMissedLines((current) => [...lines.filter((line) => !current.some((kept) => kept.quote === line.quote)), ...current]));
    }
  } catch { /* Nothing to move. */ }
}

export function getMissedLines() {
  if (typeof window === "undefined") return EMPTY;
  migrateLegacy();
  return getDemoSnapshot().missedLines ?? EMPTY;
}

export function getServerMissedLines() {
  return EMPTY;
}

export function subscribeMissedLines(onChange: () => void) {
  const off = subscribeDemoState(onChange);
  return () => { off(); };
}

/** Adds this run's misses. A line already on the list moves to the newest place instead of appearing twice. */
export function addMissedLines(lines: MissedLine[]) {
  if (!lines.length) return;
  const quotes = new Set(lines.map((line) => line.quote));
  updateMissedLines((current) => [...current.filter((line) => !quotes.has(line.quote)), ...lines]);
}

/** Lines answered right again are done. */
export function resolveMissedLines(quotes: string[]) {
  if (!quotes.length) return;
  const done = new Set(quotes);
  updateMissedLines((current) => current.filter((line) => !done.has(line.quote)));
}

/** Lines of topics that no longer exist (removed, or a new course) are dropped. */
export function keepMissedLinesFor(conceptIds: Set<string>) {
  updateMissedLines((current) => {
    const kept = current.filter((line) => conceptIds.has(line.conceptId));
    return kept.length === current.length ? current : kept;
  });
}
