import { quoteIsOnPage } from "./content-engine";
import type { PracticeItem, PracticeKind } from "./types";

/**
 * The AI content layer. It never talks to a model itself: it builds the request, and it checks
 * whatever comes back. Anything the page does not support is dropped, so a made-up fact cannot reach a student.
 */

export const AI_LIMITS = { maxPageChars: 4000, maxItems: 6, maxTextChars: 400 } as const;

export type AiTopicInput = {
  name: string;
  locator: string;
  pageText: string;
  otherTopics: string[];
};

export type AiTopicContent = {
  explanation: string;
  items: PracticeItem[];
  rejected: Array<{ reason: string; prompt: string }>;
};

export function buildPrompt(input: AiTopicInput) {
  const page = input.pageText.replace(/\s+/g, " ").trim().slice(0, AI_LIMITS.maxPageChars);
  const system = [
    "You write study material for one topic of a student's own course, using ONLY the page text provided.",
    "Never use outside knowledge. If the page does not say it, do not write it.",
    "Every item must include sourceQuote: an exact, word-for-word copy of a passage from the page that supports the answer.",
    "Write plain, direct English a student can read quickly. No praise, no filler.",
    "Reply with JSON only, matching the schema. No markdown.",
  ].join(" ");
  const user = JSON.stringify({
    topic: input.name,
    pageLocator: input.locator,
    pageText: page,
    otherTopicsInThisCourse: input.otherTopics.slice(0, 8),
    schema: {
      explanation: "2-3 sentences explaining the topic in plain words, using only the page",
      items: [{
        kind: "recall | why | cloze | choice | scenario",
        prompt: "the question",
        modelAnswer: "the correct answer, from the page",
        hint: "a nudge that does not give the answer away",
        explanation: "one sentence on why the answer is right",
        sourceQuote: "exact words from the page",
        choices: "for kind=choice only: 4 options, one correct, the others plausible but wrong",
        correctIndex: "for kind=choice only: index of the correct option",
      }],
    },
    wanted: `Up to ${AI_LIMITS.maxItems} items, a mix of kinds, at least one that asks the student to explain or predict, not just recall.`,
  });
  return { system, user };
}

const KINDS: PracticeKind[] = ["recall", "why", "cloze", "choice", "scenario"];
const text = (value: unknown, max: number = AI_LIMITS.maxTextChars) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Accepts a model's raw reply and returns only the items that are well formed and quoted from the page. */
export function validateAiReply(raw: string, input: AiTopicInput): AiTopicContent | null {
  let data: unknown;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    data = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as { explanation?: unknown; items?: unknown };
  const explanation = text(record.explanation, 600);
  const list = Array.isArray(record.items) ? record.items.slice(0, AI_LIMITS.maxItems * 2) : [];
  const items: PracticeItem[] = [];
  const rejected: AiTopicContent["rejected"] = [];

  list.forEach((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const prompt = text(item.prompt);
    const reject = (reason: string) => rejected.push({ reason, prompt: prompt || "(no prompt)" });
    const kind = item.kind as PracticeKind;
    if (!KINDS.includes(kind)) return reject("unknown kind");
    const modelAnswer = text(item.modelAnswer);
    const sourceQuote = text(item.sourceQuote, 500);
    if (!prompt || !modelAnswer) return reject("missing prompt or answer");
    if (!quoteIsOnPage(sourceQuote, input.pageText)) return reject("quote is not on the page");
    let choices: string[] | undefined;
    let correctIndex: number | undefined;
    if (kind === "choice") {
      choices = Array.isArray(item.choices) ? item.choices.map((choice) => text(choice, 160)).filter(Boolean) : [];
      correctIndex = typeof item.correctIndex === "number" ? item.correctIndex : -1;
      if (choices.length < 3 || choices.length > 5 || new Set(choices.map((choice) => choice.toLocaleLowerCase())).size !== choices.length) return reject("bad choices");
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) return reject("bad correct index");
    }
    if (kind === "cloze" && modelAnswer.split(/\s+/).length > 3) return reject("gap answer is not a short word");
    items.push({
      id: `ai-${index + 1}`,
      kind,
      prompt,
      modelAnswer,
      hint: text(item.hint) || `Look at ${input.locator}.`,
      explanation: text(item.explanation) || `${input.locator} says: “${sourceQuote}”`,
      sourceQuote,
      choices,
      correctIndex,
      origin: "ai",
    });
  });

  if (!explanation || !items.length) return null;
  return { explanation, items: items.slice(0, AI_LIMITS.maxItems), rejected };
}

/** AI questions first (they ask for explanation, not just recall); offline questions stay as the backup. */
export function mergeAiContent<T extends { teach?: { facts: string[]; pageText?: string; aiExplanation?: string }; practice?: PracticeItem[] }>(activity: T, content: AiTopicContent | null): T {
  if (!content) return activity;
  const kept = (activity.practice ?? []).filter((item) => item.origin !== "ai");
  return {
    ...activity,
    teach: { facts: activity.teach?.facts ?? [], ...activity.teach, aiExplanation: content.explanation },
    practice: [...content.items, ...kept],
  };
}
