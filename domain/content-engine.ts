import type { PracticeItem } from "./types";

/**
 * Builds teaching facts and varied practice from a topic's own page text, with no outside knowledge.
 * Everything returned quotes the page; if the page does not support an item, the item is not made.
 */

const STOP = new Set([
  "about", "above", "after", "again", "also", "among", "because", "before", "being", "between", "both", "could", "does", "each", "from", "have", "into", "more", "most", "much", "only", "other", "over", "same", "should", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "until", "very", "when", "where", "which", "while", "with", "within", "would", "will", "than", "unit",
]);

const CONNECTOR = /\b(because|therefore|so that|which means|this means|leads to|results in|causes|as a result)\b/i;
const CONDITIONAL = /^(when|if|whenever|as|once|unless)\b/i;
const EXAMPLE = /\b(for example|for instance|such as|e\.g\.)\b/i;

export function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 20);
}

function hash(value: string) {
  let h = 2166136261;
  for (const ch of value) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function words(sentence: string) {
  return sentence.match(/[A-Za-z][A-Za-z'-]+/g) ?? [];
}

function stripEnd(sentence: string) {
  return sentence.replace(/[.!?]+$/, "").trim();
}

/** Short facts, in the page's own words, ordered as written. The first is usually the definition. */
export function teachingFacts(name: string, excerpt: string, limit = 4) {
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const sentence of splitSentences(excerpt)) {
    const key = sentence.toLocaleLowerCase();
    if (seen.has(key) || sentence.length > 240) continue;
    seen.add(key);
    facts.push(sentence);
    if (facts.length >= limit) break;
  }
  return facts.length ? facts : [excerpt.slice(0, 220)];
}

function pickGapWord(sentence: string, name: string, page: string) {
  const nameParts = new Set(words(name).map((w) => w.toLocaleLowerCase()));
  const counts = new Map<string, number>();
  for (const w of words(page)) counts.set(w.toLocaleLowerCase(), (counts.get(w.toLocaleLowerCase()) ?? 0) + 1);
  const candidates = words(sentence)
    .filter((w) => w.length >= 5 && !STOP.has(w.toLocaleLowerCase()) && !nameParts.has(w.toLocaleLowerCase()))
    // Skip words glued to the start (capitalised sentence openers are rarely the idea).
    .filter((w, index, all) => !(index === 0 && all.indexOf(w) === 0 && /^[A-Z]/.test(w)));
  if (!candidates.length) return null;
  // Prefer words that are the point of the sentence: rarer on the page, then longer.
  return candidates
    .map((w) => ({ w, rarity: counts.get(w.toLocaleLowerCase()) ?? 1 }))
    .sort((a, b) => a.rarity - b.rarity || b.w.length - a.w.length)[0].w;
}

function maskName(sentence: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(`(?:the\\s+)?${escaped}`, "gi"), "this idea");
}

export function buildPractice(input: {
  conceptId: string;
  name: string;
  excerpt: string;
  locator: string;
  siblingNames: string[];
}): PracticeItem[] {
  const { conceptId, name, excerpt, locator } = input;
  const sentences = splitSentences(excerpt);
  const items: PracticeItem[] = [];
  const add = (item: Omit<PracticeItem, "id" | "origin">) => items.push({ ...item, id: `practice-${conceptId}-${items.length + 1}`, origin: "offline" });
  const definition = sentences.find((s) => s.toLocaleLowerCase().includes(name.toLocaleLowerCase())) ?? sentences[0];

  // 1. Identify the idea from its description, among the course's other topics.
  const others = [...new Set(input.siblingNames.filter((other) => other.toLocaleLowerCase() !== name.toLocaleLowerCase()))];
  if (definition && others.length >= 2) {
    const distractors = others.sort((a, b) => hash(`${conceptId}${a}`) - hash(`${conceptId}${b}`)).slice(0, 3);
    const choices = [name, ...distractors].sort((a, b) => hash(`${conceptId}x${a}`) - hash(`${conceptId}x${b}`));
    add({
      kind: "choice",
      prompt: `Which idea from your notes does this describe? “${stripEnd(maskName(definition, name))}.”`,
      modelAnswer: name,
      hint: `Think about what ${locator} is mostly about.`,
      explanation: `${locator} says: “${definition}”`,
      sourceQuote: definition,
      choices,
      correctIndex: choices.indexOf(name),
    });
  }

  // 2. Why: a sentence that gives its own reason.
  const reasoned = sentences.find((s) => CONNECTOR.test(s) && s.length <= 240);
  if (reasoned) {
    const match = reasoned.match(CONNECTOR)!;
    const before = stripEnd(reasoned.slice(0, match.index)).replace(/[,;]\s*$/, "");
    if (before.length >= 18) {
      add({
        kind: "why",
        prompt: `Your notes say: “${before}.” Why does that happen? Explain it in your own words.`,
        modelAnswer: reasoned,
        hint: `Look for the word “${match[1].toLocaleLowerCase()}” on ${locator}.`,
        explanation: `The page connects the two: “${reasoned}”`,
        sourceQuote: reasoned,
      });
    }
  }

  // 3. Predict from a condition the page states.
  const conditional = sentences.find((s) => CONDITIONAL.test(s) && /,/.test(s) && s.length <= 240 && s !== reasoned);
  if (conditional) {
    const comma = conditional.indexOf(",");
    const condition = conditional.slice(0, comma).replace(CONDITIONAL, "").trim();
    const consequence = conditional.slice(comma + 1).trim();
    if (condition.length >= 6 && consequence.length >= 12) {
      add({
        kind: "scenario",
        prompt: `Suppose ${condition}. What does ${locator} say follows? Explain it in your own words.`,
        modelAnswer: conditional,
        hint: `The page states what happens in this case. Start from “${condition}”.`,
        explanation: `The page says: “${conditional}”`,
        sourceQuote: conditional,
      });
    }
  }

  // 4. Fill the gap in a key sentence.
  for (const sentence of sentences.slice(0, 5)) {
    if (sentence === definition && sentences.length > 1) continue;
    if (words(sentence).length < 7 || sentence.length > 220) continue;
    const gap = pickGapWord(sentence, name, excerpt);
    if (!gap) continue;
    const masked = sentence.replace(new RegExp(`\\b${gap}\\b`), "_____");
    add({
      kind: "cloze",
      prompt: `Fill the gap from ${locator}: “${masked}”`,
      modelAnswer: gap,
      hint: `It is one word. It starts with “${gap[0]}” and has ${gap.length} letters.`,
      explanation: `The page says: “${sentence}”`,
      sourceQuote: sentence,
    });
    break;
  }

  // 5. Recall the definition in the learner's own words.
  if (definition) {
    add({
      kind: "recall",
      prompt: `In your own words, what do your notes say about ${name}?`,
      modelAnswer: definition,
      hint: `Return to ${locator}. Start from what it is, then one detail.`,
      explanation: `The page says: “${definition}”`,
      sourceQuote: definition,
    });
  }
  return items;
}

/** A practice item is only kept if its quote is really on the page. */
export function quoteIsOnPage(quote: string, pageText: string) {
  const normalise = (value: string) => value.toLocaleLowerCase().replace(/[“”"'’‘]/g, "").replace(/\s+/g, " ").trim();
  const q = normalise(quote);
  return q.length >= 12 && normalise(pageText).includes(q);
}
