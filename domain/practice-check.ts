import type { PracticeItem } from "./types";

/** Only items that can be checked instantly and fairly: pick one, or type one word. */
export function isDrillable(item: PracticeItem) {
  return item.kind === "choice" || item.kind === "cloze";
}

function clean(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, " ").trim();
}

function distance(a: string, b: string) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

/** Right if it matches, allowing a plural or one typo on longer words. Never accepts a different word. */
export function checkPracticeAnswer(item: PracticeItem, answer: string | number): boolean {
  if (item.kind === "choice") return typeof answer === "number" && answer === item.correctIndex;
  if (typeof answer !== "string") return false;
  const given = clean(answer);
  const expected = clean(item.modelAnswer);
  if (!given || !expected) return false;
  if (given === expected) return true;
  if (given.replace(/(?:es|s)$/, "") === expected.replace(/(?:es|s)$/, "")) return true;
  return expected.length >= 7 && distance(given, expected) <= 1;
}
