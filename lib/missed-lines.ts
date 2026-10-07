/**
 * The lines from your notes that you missed in a run, kept on this device so the next visit can start with them.
 * A line leaves the list once you get it right in a warm-up. Nothing here is sent anywhere.
 */

import type { MissedLine } from "@/domain/return-visit";

export type { MissedLine };

const KEY = "kelus-missed-lines-v1";
const EVENT = "kelus-missed-lines";
const LIMIT = 40;
const EMPTY: MissedLine[] = [];
let cache: { raw: string | null; value: MissedLine[] } = { raw: null, value: EMPTY };

function read(): MissedLine[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.value;
    const parsed = raw ? JSON.parse(raw) : [];
    cache = { raw, value: Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.quote === "string") : EMPTY };
    return cache.value;
  } catch {
    return EMPTY;
  }
}

function write(lines: MissedLine[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(lines.slice(-LIMIT))); } catch { /* Without storage the warm-up simply has nothing to show. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function getMissedLines() {
  return typeof window === "undefined" ? EMPTY : read();
}

export function getServerMissedLines() {
  return EMPTY;
}

export function subscribeMissedLines(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", onChange); };
}

/** Adds this run's misses. A line already on the list moves to the newest place instead of appearing twice. */
export function addMissedLines(lines: MissedLine[]) {
  if (!lines.length) return;
  const quotes = new Set(lines.map((line) => line.quote));
  write([...read().filter((line) => !quotes.has(line.quote)), ...lines]);
}

/** Lines answered right again are done. */
export function resolveMissedLines(quotes: string[]) {
  if (!quotes.length) return;
  const done = new Set(quotes);
  write(read().filter((line) => !done.has(line.quote)));
}

/** Lines of topics that no longer exist (removed, or a new course) are dropped. */
export function keepMissedLinesFor(conceptIds: Set<string>) {
  const current = read();
  const kept = current.filter((line) => conceptIds.has(line.conceptId));
  if (kept.length !== current.length) write(kept);
}
