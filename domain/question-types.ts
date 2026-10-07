import type { PracticeItem } from "./types";

/**
 * Questions that ask for understanding, not just a word: why something happens, what a rule predicts, how two
 * ideas differ, which term a definition belongs to. Each is checkable instantly, built only from the page, and
 * every wrong option is something the page (or its course) really says, so a student has to think to rule it out.
 */

type Draft = Omit<PracticeItem, "id" | "origin">;
type Ctx = { conceptId: string; name: string; locator: string; sentences: string[]; siblingNames: string[]; others: string[]; /** Key words from this page: wrong options that belong to the same topic. */ terms: string[] };

function h(value: string) {
  let out = 2166136261;
  for (const ch of value) { out ^= ch.charCodeAt(0); out = Math.imul(out, 16777619); }
  return out >>> 0;
}
const shuffle = <T,>(items: T[], seed: string, text: (item: T) => string = String as unknown as (item: T) => string) => [...items].sort((a, b) => h(`${seed}${text(a)}`) - h(`${seed}${text(b)}`));
const strip = (sentence: string) => sentence.replace(/[.!?]+["”]?$/, "").trim();
const cap = (text: string) => (text ? text[0].toLocaleUpperCase() + text.slice(1) : text);
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const PRONOUN_START = /^(?:it|they|this|these|that|those|he|she|its|their|there)\b/i;

const VERBS = "is|are|was|were|has|have|had|binds|bind|moves|move|uses|use|produces|produce|requires|require|gains|gain|loses|lose|dissociates|dissociate|causes|cause|increases|increase|decreases|decrease|shifts|shift|reduces|reduce|raises|raise|lowers|lower|takes|take|runs|run|works|work|stores|store|needs|need|means|mean|occurs|occur|describes|describe|ignores|ignore|allows|allow|provides|provide|splits|split|speeds|speed|measures|measure|states|state|resolves|resolve|gives|give|ends|end|forms|form|slopes|slope|lasts|last|finds|find|stays|stay|acts|act|points|point|exerts|exert|equals|equal|depends|depend|keeps|keep|stops|stop|sets|set|stand|stands|remain|remains|become|becomes|travels|travel|absorbs|absorb|releases|release|converts|convert|carries|carry|controls|control|regulates|regulate|protects|protect|contains|contain|includes|include|consists|consist|helps|help|leads|lead|breaks|break|joins|join|attaches|attach|enters|enter|leaves|leave|creates|create|destroys|destroy|waits|wait|drops|drop|grows|grow|falls|fall|rises|rise";

/** "A competitive inhibitor binds the active site" → { subject: "a competitive inhibitor", predicate: "binds the active site" }. */
export function subjectPredicate(clause: string): { subject: string; predicate: string } | null {
  const text = strip(clause).replace(/^(?:however|therefore|thus|also|in addition),?\s+/i, "");
  const match = text.match(new RegExp(`^((?:an?|the|each|every)\\s+)?((?:[A-Za-z][A-Za-z'’-]*\\s+){0,4}?[A-Za-z][A-Za-z'’-]*?)\\s+((?:${VERBS})\\b.*)$`, "i"));
  if (!match) return null;
  const subject = `${match[1] ?? ""}${match[2]}`.trim();
  const predicate = match[3].trim();
  if (words(subject) > 5 || words(predicate) < 2 || PRONOUN_START.test(subject)) return null;
  return { subject, predicate };
}

/** "X … because Y": the effect and the reason, when the effect stands on its own. */
function becauseParts(sentence: string) {
  const match = sentence.match(/^(.{18,}?),?\s+because\s+(?!of\b)(.{12,})$/i);
  if (!match) return null;
  const effect = strip(match[1]).replace(/[,;]\s*$/, "");
  const reason = strip(match[2]);
  if (PRONOUN_START.test(effect) || words(reason) < 3 || words(reason) > 22 || words(effect) < 4) return null;
  return { effect, reason };
}

const similarLength = (target: string, candidate: string) => candidate.length >= target.length * 0.5 && candidate.length <= target.length * 1.8;

/** Why: pick the reason the notes give. Wrong options are other reasons the same notes give for other things. */
export function whyChoices(ctx: Ctx): Draft[] {
  const parts = ctx.sentences.map((sentence) => ({ sentence, parts: becauseParts(sentence) })).filter((entry) => entry.parts !== null) as Array<{ sentence: string; parts: { effect: string; reason: string } }>;
  const out: Draft[] = [];
  for (const entry of parts.slice(0, 3)) {
    const wrong = parts.filter((other) => other.sentence !== entry.sentence && similarLength(entry.parts.reason, other.parts.reason) && other.parts.reason.toLocaleLowerCase() !== entry.parts.reason.toLocaleLowerCase()).map((other) => other.parts.reason);
    // With fewer than two other reasons, other true statements from the same page work as wrong options:
    // they are real, on-topic, and only one of them explains this effect.
    if (wrong.length < 2) {
      const statements = ctx.sentences
        .filter((other) => other !== entry.sentence && !PRONOUN_START.test(other) && !/\bbecause\b/i.test(other) && similarLength(entry.parts.reason, strip(other)) && !other.toLocaleLowerCase().includes(entry.parts.effect.toLocaleLowerCase().slice(0, 24)))
        .map(strip);
      wrong.push(...shuffle(statements, `${ctx.conceptId}s${entry.sentence}`).slice(0, 3 - wrong.length));
    }
    if (wrong.length < 2) continue;
    const reasons = [entry.parts.reason, ...shuffle(wrong, `${ctx.conceptId}${entry.sentence}`).slice(0, 3)];
    const choices = shuffle(reasons, `${ctx.conceptId}y${entry.sentence}`).map(cap);
    out.push({
      kind: "choice",
      variant: "why",
      level: "understand",
      prompt: `Why, according to your notes? “${cap(entry.parts.effect)}.”`,
      modelAnswer: cap(entry.parts.reason),
      hint: `Look for the word “because” on ${ctx.locator}.`,
      explanation: `${ctx.locator}: “${entry.sentence}”`,
      sourceQuote: entry.sentence,
      choices,
      correctIndex: choices.indexOf(cap(entry.parts.reason)),
    });
  }
  return out;
}

const CONTRAST = /^(.{20,}?)(?:,|;)\s+(?:while|whereas)\s+(.{20,})$|^unlike\s+(.{8,}?),\s+(.{20,})$/i;

/** Contrast: which of two things does this describe? Wrong options are what the other thing does, or what a different idea on the page does. */
export function contrastChoices(ctx: Ctx): Draft[] {
  const out: Draft[] = [];
  for (const sentence of ctx.sentences) {
    const match = strip(sentence).match(CONTRAST);
    if (!match || match[3]) continue;
    const left = subjectPredicate(match[1]);
    const right = subjectPredicate(match[2]);
    if (!left || !right) continue;
    if (left.subject.toLocaleLowerCase() === right.subject.toLocaleLowerCase()) continue;
    const askLeft = h(`${ctx.conceptId}${sentence}`) % 2 === 0;
    const [target, other] = askLeft ? [left, right] : [right, left];
    const strangers = ctx.sentences
      .filter((s) => s !== sentence)
      .map((s) => subjectPredicate(s))
      .filter((sp): sp is { subject: string; predicate: string } => sp !== null && similarLength(target.predicate, sp.predicate) && sp.predicate.toLocaleLowerCase() !== target.predicate.toLocaleLowerCase());
    const options = [target.predicate, other.predicate, ...shuffle(strangers, `${ctx.conceptId}z${sentence}`, (sp) => sp.predicate).slice(0, 1).map((sp) => sp.predicate)];
    if (options.length < 3) continue;
    const choices = shuffle(options, `${ctx.conceptId}c${sentence}`).map(cap);
    const subject = target.subject.replace(/^(?:a|an|the|each|every)\s+/i, "");
    out.push({
      kind: "choice",
      variant: "match",
      level: "understand",
      prompt: `According to your notes, which describes ${/^(?:a|an|the)\b/i.test(target.subject) ? target.subject.toLocaleLowerCase() : subject}?`,
      modelAnswer: cap(target.predicate),
      hint: `${ctx.locator} compares two things in one sentence.`,
      explanation: `${ctx.locator}: “${sentence}”`,
      sourceQuote: sentence,
      choices,
      correctIndex: choices.indexOf(cap(target.predicate)),
    });
    if (out.length >= 2) break;
  }
  return out;
}

/** Which term does this definition belong to? "X is Y" statements; other terms on the page or in the course are the options. */
export function termFromMeaning(ctx: Ctx): Draft[] {
  const defs: Array<{ term: string; meaning: string; sentence: string }> = [];
  for (const sentence of ctx.sentences) {
    const match = strip(sentence).match(/^((?:[A-Z][A-Za-z'’-]*)(?:\s+[A-Za-z'’-]+){0,3}?)\s+(?:is|are|means|refers to)\s+((?:an?|the|something|when|any|one)\s.{20,})$/);
    if (!match) continue;
    const term = match[1].trim();
    if (term.toLocaleLowerCase() === ctx.name.toLocaleLowerCase() || PRONOUN_START.test(term) || words(term) > 4) continue;
    // "Factorial is a classic example: …" describes an example, not what the word means.
    if (/^(?:an? )?(?:classic |common |simple |typical )?example\b|:/.test(match[2])) continue;
    defs.push({ term, meaning: match[2].trim(), sentence });
  }
  const out: Draft[] = [];
  for (const def of defs.slice(0, 2)) {
    // Wrong options come from this page first (other defined terms, other key words), then the course's other topics.
    const single = words(def.term) === 1;
    const onPage = [...defs.filter((d) => d !== def).map((d) => d.term), ...ctx.terms.map((t) => (single ? cap(t) : t))];
    const inMeaning = (t: string) => def.meaning.toLocaleLowerCase().includes(t.toLocaleLowerCase());
    const eligible = (t: string) => t.toLocaleLowerCase() !== def.term.toLocaleLowerCase() && !inMeaning(t) && Math.abs(words(t) - words(def.term)) <= 1;
    const pool = [...new Set(onPage)].filter(eligible);
    const course = ctx.others.filter(eligible);
    const wrong = [...shuffle(pool, `${ctx.conceptId}${def.term}`).slice(0, 3), ...shuffle(course, `${ctx.conceptId}k${def.term}`)].slice(0, 3);
    if (wrong.length < 2) continue;
    const choices = shuffle([def.term, ...wrong], `${ctx.conceptId}m${def.term}`);
    out.push({
      kind: "choice",
      variant: "match",
      level: "recall",
      prompt: `Which term does this describe? “${cap(def.meaning)}.”`,
      modelAnswer: def.term,
      hint: `The term is defined on ${ctx.locator}.`,
      explanation: `${ctx.locator}: “${def.sentence}”`,
      sourceQuote: def.sentence,
      choices,
      correctIndex: choices.indexOf(def.term),
    });
  }
  return out;
}
