import { buildPractice, splitSentences } from "./content-engine";
import { isDrillable } from "./practice-check";
import type { LearningActivity, PracticeItem, RetrievalOutcome } from "./types";

export type SelfGrade = "nailed" | "partly" | "missed";

export type QuickRun = {
  checks: PracticeItem[];
  explainPrompt: string;
  explainAnswer: string;
  explainQuote: string;
  /** The page's sentences, so a wrong answer can be shown where it really belongs. */
  sentences: string[];
  /** A line from the page that no check and no explanation used: something new to end on. */
  extraFact?: string;
  topic: string;
};

const norm = (text: string) => text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const overlaps = (a: string, b: string) => { const x = norm(a); const y = norm(b); return Boolean(x && y) && (x.includes(y) || y.includes(x)); };
const hasWord = (text: string, word: string) => new RegExp(`(?:^| )${norm(word)}(?: |$)`).test(norm(text));

/** The words around a gap: "In a _____ solution" twice is the same question twice, whatever the answer. */
function gapFrame(item: PracticeItem) {
  if (item.kind !== "cloze") return null;
  const [before = "", after = ""] = item.prompt.split("_____");
  return `${norm(before).split(" ").slice(-2).join(" ")}|${norm(after).split(" ")[0] ?? ""}`;
}

/**
 * Two checks clash when they test the same fact, use the same gap frame, or when the earlier one's feedback
 * (which shows its quote) would give away the later one's answer.
 */
function clashes(earlier: PracticeItem, later: PracticeItem) {
  if (overlaps(earlier.sourceQuote, later.sourceQuote)) return true;
  const frame = gapFrame(later);
  if (frame && frame === gapFrame(earlier)) return true;
  if (later.kind === "cloze" && hasWord(earlier.sourceQuote, later.modelAnswer)) return true;
  if (earlier.kind === "cloze" && hasWord(later.prompt, earlier.modelAnswer)) return true;
  return false;
}

const MAX_CHECKS = 3;

function pickChecks(all: PracticeItem[], round: number, strict = true) {
  const turn = all.length ? (round * MAX_CHECKS) % all.length : 0;
  const pool = [...all.slice(turn), ...all.slice(0, turn)];
  const style = (item: PracticeItem) => item.variant ?? item.kind;
  // A question that asks "why" or "which" beats a fill-in gap, so one understanding item leads when the page has one.
  // Then one of each style before a second of any, and never two checks on the same fact.
  const lead = pool.find((item) => item.level === "understand");
  const ordered = [...(lead ? [lead] : []), ...pool.filter((item) => item !== lead)];
  const checks: PracticeItem[] = [];
  for (const varied of [true, false]) {
    for (const item of ordered) {
      if (checks.length >= MAX_CHECKS || checks.includes(item)) continue;
      if (varied && checks.some((chosen) => style(chosen) === style(item))) continue;
      if (strict && checks.some((chosen) => clashes(chosen, item))) continue;
      // One fill-the-gap per run while other kinds of question are still available: a run should make you think,
      // not just recall a word.
      if (strict && item.kind === "cloze" && checks.some((chosen) => chosen.kind === "cloze") && ordered.some((other) => other.kind !== "cloze" && !checks.includes(other) && !checks.some((chosen) => clashes(chosen, other)))) continue;
      checks.push(item);
    }
  }
  return checks;
}

/**
 * A short run for one topic: up to three instant checks, then one explanation in the learner's own words.
 * Everything comes from the topic's page, and each check tests a different fact from the one the explanation asks for.
 * Every topic gets the same run. A page too thin for two checks still gets one check, or none, and the
 * explanation; null only when there is nothing on the page to explain at all.
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
  const explainAnswer = activity.retrieve.modelAnswer;
  // "Which idea does this describe?" is answered by the topic name at the top of the screen, so it is a last resort.
  const anyDrillable = own.filter(isDrillable);
  const drillable = anyDrillable.filter((item) => !/^Which idea\b/.test(item.prompt));
  // The explanation at the end asks for this sentence, so a check that shows it first would spoil it.
  const fresh = drillable.filter((item) => !overlaps(item.sourceQuote, explainAnswer));
  // A very short page may have nothing else to ask; then a check on the main sentence beats no quick run at all.
  const fromFresh = pickChecks(fresh, round);
  const fromAny = fromFresh.length >= 2 ? fromFresh : pickChecks(drillable, round);
  const fromAll = fromAny.length >= 2 ? fromAny : pickChecks(anyDrillable, round);
  // A one-sentence page (common in slides) can only be asked about that sentence; two angles on it still beat none.
  const checks = fromAll.length >= 2 ? fromAll : pickChecks(anyDrillable, round, false);
  const usable = checks.length >= 2 ? checks : pickChecks(anyDrillable, round, false).slice(0, 1);
  if (!explainAnswer.trim()) return null;
  const sentences = splitSentences([activity.learn.explanation, ...activity.learn.keyPoints].join("\n"));
  const used = [explainAnswer, ...usable.map((item) => item.sourceQuote)];
  const extraFact = sentences.find((sentence) => sentence.length >= 40 && !used.some((quote) => overlaps(quote, sentence)));
  return {
    checks: usable,
    explainPrompt: round % 2 === 1 ? `Close the page. What would you tell a friend about ${name}?` : activity.retrieve.prompt,
    explainAnswer,
    explainQuote: explainAnswer,
    sentences,
    extraFact,
    topic: name,
  };
}

/**
 * A wrong answer is usually a real word from the notes, just from another line. Finding that line turns "Not quite"
 * into the actual lesson: what the word does mean, next to what was asked.
 */
export function whereAnswerBelongs(item: PracticeItem, given: string, sentences: string[]) {
  const answer = norm(given);
  if (answer.length < 3 || answer === norm(item.modelAnswer)) return null;
  const single = !answer.includes(" ");
  return sentences.find((sentence) => !overlaps(sentence, item.sourceQuote) && (single ? hasWord(sentence, answer) : norm(sentence).includes(answer))) ?? null;
}

/**
 * One outcome for the topic, from two kinds of evidence: how many quick checks were right, and how the
 * learner rated their own explanation. A strong rating cannot rescue wrong checks, and a miss caps the result.
 */
export function quickOutcome(input: { right: number; total: number; self: SelfGrade }): RetrievalOutcome {
  // With no checks, the explanation is the only evidence, so it decides alone.
  if (input.total === 0) return input.self === "nailed" ? "success" : input.self === "partly" ? "partial" : "failure";
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
  if (input.total === 0) return `You rated your explanation: ${rating}.`;
  return `${input.right} of ${input.total} quick checks right${unsure}. You rated your explanation: ${rating}.`;
}
