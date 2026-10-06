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

const BULLET = /^\s*(?:[•◦▪▫●○■□‣⁃*–—-]|\(?\d{1,2}[.)]|\(?[a-z][.)])\s+/;
const NUMBERED = /^\s*\(?(\d{1,2})[.)]\s+/;

/**
 * One idea per unit: a bullet, a numbered step, a "term: meaning" line, or a sentence.
 * Bullet and step markers are removed so they never leak into questions.
 */
export function units(text: string) {
  const out: string[] = [];
  // A PDF wraps long lines. A line that starts in lowercase continues the one before it.
  const lines: string[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (lines.length && /^[a-z]/.test(line) && !BULLET.test(line)) lines[lines.length - 1] += ` ${line}`;
    else lines.push(line);
  }
  for (const line of lines) {
    const cleaned = line.replace(BULLET, "").replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const parts = cleaned.length > 60 ? splitSentences(cleaned) : [cleaned];
    for (const part of parts) if (part.length >= 15) out.push(part);
  }
  return out;
}

/** Term/meaning pairs: "Term: meaning" or "Term - meaning". The term is short; the meaning says something. */
export function termPairs(text: string) {
  const pairs: Array<{ term: string; meaning: string; line: string }> = [];
  for (const line of units(text)) {
    const match = line.match(/^([A-Z][A-Za-z0-9 /&'’()-]{1,40}?)\s*(?::|\s[-–—]\s)\s*(.{12,})$/);
    if (!match) continue;
    const term = match[1].trim();
    if (term.split(/\s+/).length > 5) continue;
    pairs.push({ term, meaning: match[2].trim().replace(/[.]+$/, ""), line });
  }
  return pairs;
}

/** Numbered steps in the order the page gives them. */
export function numberedSteps(rawText: string) {
  const steps: Array<{ n: number; text: string }> = [];
  for (const line of rawText.split(/\n+/)) {
    const match = line.match(NUMBERED);
    if (match) steps.push({ n: Number(match[1]), text: line.replace(NUMBERED, "").replace(/\s+/g, " ").trim() });
  }
  return steps.length >= 3 && steps.every((step, index) => step.n === steps[0].n + index) ? steps : [];
}

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
  for (const sentence of units(excerpt)) {
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

/**
 * Hides the topic name so the question does not give itself away. Only when the topic is the subject at the
 * start of the sentence and appears nowhere else: replacing it inside a longer phrase ("Price elasticity of
 * demand" for the topic "Elasticity") would break the sentence, so no question is made instead.
 */
function maskName(sentence: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lead = new RegExp(`^(?:the\\s+)?${escaped}(?![A-Za-z])`, "i");
  if (!lead.test(sentence)) return null;
  const rest = sentence.replace(lead, "");
  if (new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "i").test(rest)) return null;
  // A plural subject ("Market structures differ...") reads "These ideas", not "This idea differ".
  const plural = /^\s*(?:are|were|have|do|differ|vary|include|share|use|take|make|need|require|form|become|depend|determine)\b/i.test(rest);
  return `${plural ? "These ideas" : "This idea"}${rest}`;
}

export function buildPractice(input: {
  conceptId: string;
  name: string;
  excerpt: string;
  locator: string;
  siblingNames: string[];
}): PracticeItem[] {
  const { conceptId, name, excerpt, locator } = input;
  const sentences = units(excerpt);
  const items: PracticeItem[] = [];
  const add = (item: Omit<PracticeItem, "id" | "origin">) => items.push({ ...item, id: `practice-${conceptId}-${items.length + 1}`, origin: "offline" });
  const definition = sentences.find((s) => s.toLocaleLowerCase().includes(name.toLocaleLowerCase())) ?? sentences[0];

  // 1. Identify the idea from its description, among the course's other topics.
  const others = [...new Set(input.siblingNames.filter((other) => other.toLocaleLowerCase() !== name.toLocaleLowerCase()))];
  const maskedDefinition = definition ? maskName(definition, name) : null;
  if (definition && maskedDefinition && others.length >= 2) {
    const distractors = others.sort((a, b) => hash(`${conceptId}${a}`) - hash(`${conceptId}${b}`)).slice(0, 3);
    const choices = [name, ...distractors].sort((a, b) => hash(`${conceptId}x${a}`) - hash(`${conceptId}x${b}`));
    add({
      kind: "choice",
      prompt: `Which idea from your notes does this describe? “${stripEnd(maskedDefinition)}.”`,
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

  // 4. Fill the gap in a key sentence: up to two, from different sentences with different words.
  const usedGaps = new Set<string>();
  let gapsMade = 0;
  for (const sentence of sentences.slice(0, 6)) {
    if (sentence === definition && sentences.length > 1) continue;
    if (words(sentence).length < 7 || sentence.length > 220) continue;
    const pair = termPairs(sentence)[0];
    const gapSource = pair && sentence.includes(pair.meaning) ? pair.meaning : sentence;
    const gap = pickGapWord(gapSource, pair ? `${name} ${pair.term}` : name, excerpt);
    if (!gap || usedGaps.has(gap.toLocaleLowerCase())) continue;
    usedGaps.add(gap.toLocaleLowerCase());
    const blank = (value: string) => value.replace(new RegExp(`\\b${gap}\\b`), "_____");
    const masked = pair && sentence.includes(pair.meaning) ? sentence.replace(pair.meaning, blank(pair.meaning)) : blank(sentence);
    add({
      kind: "cloze",
      prompt: `Fill the gap from ${locator}: “${masked}”`,
      modelAnswer: gap,
      hint: `It is one word. It starts with “${gap[0]}” and has ${gap.length} letters.`,
      explanation: `The page says: “${sentence}”`,
      sourceQuote: sentence,
    });
    gapsMade += 1;
    if (gapsMade >= 2) break;
  }

  // 4b. Terms and their meanings on this page: name the term from its meaning, using the page's other terms as options.
  const pairs = termPairs(excerpt).filter((pair) => pair.term.toLocaleLowerCase() !== name.toLocaleLowerCase());
  if (pairs.length >= 2) {
    const target = pairs[hash(conceptId) % pairs.length];
    const options = pairs.map((pair) => pair.term);
    const choices = options.sort((a, b) => hash(`${conceptId}t${a}`) - hash(`${conceptId}t${b}`)).slice(0, 4);
    if (choices.length >= 3 && choices.includes(target.term)) {
      add({
        kind: "choice",
        prompt: `Which one matches: “${target.meaning}”?`,
        modelAnswer: target.term,
        hint: `These are the terms listed on ${locator}.`,
        explanation: `${locator}: “${target.line}”`,
        sourceQuote: target.line,
        choices,
        correctIndex: choices.indexOf(target.term),
      });
    }
  }

  // 4c. Steps in order: what comes next.
  const steps = numberedSteps(excerpt);
  if (steps.length >= 3) {
    const at = hash(conceptId) % (steps.length - 1);
    const here = steps[at];
    const after = steps[at + 1];
    const options = steps.filter((step) => step !== after && step !== here).map((step) => step.text);
    const choices = [after.text, ...options.sort((a, b) => hash(`${conceptId}s${a}`) - hash(`${conceptId}s${b}`)).slice(0, 3)]
      .sort((a, b) => hash(`${conceptId}z${a}`) - hash(`${conceptId}z${b}`));
    add({
      kind: "choice",
      prompt: `In your notes, what comes right after: “${here.text}”?`,
      modelAnswer: after.text,
      hint: `The steps are numbered on ${locator}.`,
      explanation: `${locator} lists step ${here.n} then step ${after.n}: “${after.text}”`,
      sourceQuote: after.text,
      choices,
      correctIndex: choices.indexOf(after.text),
    });
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
