import type {
  Concept,
  ConceptRelationship,
  ExtractedMaterialPage,
  LearningActivity,
  Prompt,
  ProposedConcept,
} from "./types";

const ADMINISTRATIVE =
  /\b(?:assessment|attendance|calendar|contact|course syllabus|email|grading|instructor|office hours|policy|reading list|schedule|syllabus|textbook)\b/i;
const HEADING_PREFIX = /^(?:week|module|topic|chapter|unit|lecture|section)\s*\d*[.:\-–—]?\s*/i;
const NUMBER_PREFIX = /^\s*(?:\d+(?:\.\d+)*|[ivx]+)[.)\-:]\s*/i;
const EXAM_SIGNAL =
  /\b(?:exam|midterm|final|tests?|tested|assessment|learning objectives?|will be asked|must know|high-?yield|core concept|key concept|important|critical|essential|fundamental)\b/i;
const DEFINITION_SIGNAL =
  /\b(?:is defined as|refers to|means that|measures|describes|occurs when|happens when|is the|are the)\b/i;
const PREREQ_SIGNAL =
  /\b(?:prerequisites?|requires?|required|depends on|dependent on|builds on|built on|based on|before studying|after mastering|extension of|application of|assumes knowledge of|you should already know)\b/i;
const RELATED_SIGNAL = /\b(?:related to|closely related|see also|compared with|in contrast to|versus|vs\.?)\b/i;

function cleanCandidate(value: string) {
  return value
    .replace(NUMBER_PREFIX, "")
    .replace(HEADING_PREFIX, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, "")
    .trim();
}

function looksLikeConcept(value: string) {
  if (value.length < 3 || value.length > 72 || ADMINISTRATIVE.test(value)) return false;
  if (/https?:|@|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(value)) return false;
  if (/\b(?:due|points?|percent|room|pm|am)\b/i.test(value)) return false;
  const words = value.split(/\s+/);
  if (words.length > 9) return false;
  const titleWords = words.filter((word) => /^[A-Z][A-Za-z/&-]*$/.test(word)).length;
  return HEADING_PREFIX.test(value) || NUMBER_PREFIX.test(value) || titleWords >= Math.max(1, Math.ceil(words.length * 0.55));
}

function stablePart(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function excerptFor(lines: string[], index: number, fallback: string) {
  const nearby = lines
    .slice(index + 1, index + 5)
    .map((line) => line.trim())
    .filter((line) => line.length > 20 && !looksLikeConcept(line));
  return (nearby[0] ?? nearby[1] ?? fallback).slice(0, 420);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pageNumberFromLocator(locator: string) {
  const match = locator.match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

function mentionCount(name: string, corpus: string) {
  return corpus.match(new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi"))?.length ?? 0;
}

function sentencesFrom(excerpt: string) {
  return excerpt
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 18);
}

function centralClaim(name: string, excerpt: string) {
  const sentences = sentencesFrom(excerpt);
  if (!sentences.length) return excerpt.slice(0, 220);
  const named = sentences.find((sentence) => sentence.toLocaleLowerCase().includes(name.toLocaleLowerCase()));
  const defined = sentences.find((sentence) => DEFINITION_SIGNAL.test(sentence));
  return (named ?? defined ?? sentences[0]).slice(0, 260);
}

function headingStrengthFor(name: string) {
  let strength = 0.35;
  if (NUMBER_PREFIX.test(name) || /^\d+/.test(name)) strength += 0.25;
  if (HEADING_PREFIX.test(name)) strength += 0.25;
  if (name === name.toUpperCase() && name.length > 4) strength += 0.1;
  return clamp(strength, 0, 1);
}

function scoreExamImportance(input: {
  name: string;
  excerpt: string;
  locator: string;
  corpus: string;
  index: number;
  total: number;
}) {
  let score = 0.52;
  score += clamp((mentionCount(input.name, input.corpus) - 1) * 0.035, 0, 0.14);
  score += headingStrengthFor(input.name) * 0.08;
  if (EXAM_SIGNAL.test(input.excerpt) || EXAM_SIGNAL.test(input.name)) score += 0.12;
  if (DEFINITION_SIGNAL.test(input.excerpt)) score += 0.05;
  if (pageNumberFromLocator(input.locator) <= 2) score += 0.04;
  score += clamp(((input.total - input.index) / Math.max(input.total, 1)) * 0.04, 0, 0.04);
  return clamp(Number(score.toFixed(3)), 0.35, 0.95);
}

function scoreDifficulty(excerpt: string) {
  let score = 0.45;
  if (excerpt.length > 180) score += 0.08;
  if (/\b(?:however|whereas|trade-?off|equilibrium|derivative|integral|theorem|proof|paradox)\b/i.test(excerpt)) {
    score += 0.12;
  }
  if (/\d/.test(excerpt)) score += 0.05;
  return clamp(Number(score.toFixed(3)), 0.3, 0.8);
}

function buildActivity(concept: Concept, proposal: ProposedConcept): LearningActivity {
  const claim = centralClaim(concept.name, proposal.sourceExcerpt);
  return {
    id: `activity-${concept.id}`,
    conceptId: concept.id,
    learn: {
      title: `Make ${concept.name} usable from the source.`,
      explanation: claim,
      keyPoints: [
        `Find the claim the source makes about ${concept.name}.`,
        "Cover the excerpt, then restate that claim without looking.",
        `Keep one concrete detail from ${proposal.locator} so the idea stays grounded.`,
      ],
    },
    retrieve: {
      prompt: `Without looking, what central claim does the course make about ${concept.name}?`,
      hint: `Return to ${proposal.locator}. Start from the relationship or definition, not a list of facts.`,
      explanation: claim,
      example: `Restate the source claim about ${concept.name} in one sentence, then add one detail from ${proposal.locator}.`,
      modelAnswer: claim,
    },
    apply: {
      prompt: `Apply the source's claim about ${concept.name} to a new example that is not copied from the page.`,
      hint: "Keep the same underlying relationship. Change only the situation.",
      modelAnswer: `A strong answer reuses this claim in a new context: ${claim}`,
    },
    sourceReferences: [{ materialId: proposal.materialId, label: proposal.sourceLabel, locator: proposal.locator }],
  };
}

function inferRelationships(concepts: Concept[], corpus: string): ConceptRelationship[] {
  const relationships: ConceptRelationship[] = [];
  const seen = new Set<string>();

  for (const left of concepts) {
    for (const right of concepts) {
      if (left.id === right.id) continue;
      const leftPattern = escapeRegExp(left.name);
      const rightPattern = escapeRegExp(right.name);

      // "Elasticity builds on Supply and Demand" => Supply and Demand → Elasticity
      const dependsOn = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:requires|required|depends on|dependent on|builds on|built on|based on|assumes knowledge of)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );
      // "Supply and Demand is a prerequisite for Elasticity"
      const precedes = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:prerequisite for|before studying|before learning)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );
      // Both names must be the related pair — not "related to Something Else".
      const related = new RegExp(
        `\\b${leftPattern}\\b[\\s\\S]{0,40}\\b(?:related to|closely related|see also|compared with|in contrast to|versus|vs\\.?)\\b[\\s\\S]{0,40}\\b${rightPattern}\\b`,
        "i",
      );

      let kind: ConceptRelationship["kind"] | null = null;
      let fromId = left.id;
      let toId = right.id;

      if (dependsOn.test(corpus)) {
        kind = "prerequisite";
        fromId = right.id;
        toId = left.id;
      } else if (precedes.test(corpus)) {
        kind = "prerequisite";
        fromId = left.id;
        toId = right.id;
      } else if (related.test(corpus)) {
        kind = "related";
      }
      if (!kind) continue;

      const key = `${kind}:${fromId}:${toId}`;
      const reverse = `${kind}:${toId}:${fromId}`;
      if (seen.has(key) || (kind === "related" && seen.has(reverse))) continue;
      if (kind === "prerequisite" && seen.has(`prerequisite:${toId}:${fromId}`)) continue;
      seen.add(key);
      relationships.push({ id: `rel-${stablePart(key)}`, fromId, toId, kind });
    }
  }

  return relationships.slice(0, 12);
}

function looksLikeConceptRelaxed(value: string) {
  if (value.length < 3 || value.length > 80 || ADMINISTRATIVE.test(value)) return false;
  if (/https?:|@|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(value)) return false;
  if (/\b(?:due|points?|percent|room)\b/i.test(value)) return false;
  const words = value.split(/\s+/);
  if (words.length > 12) return false;
  const titleWords = words.filter((word) => /^[A-Z][A-Za-z/&-]*$/.test(word)).length;
  return (
    HEADING_PREFIX.test(value) ||
    NUMBER_PREFIX.test(value) ||
    titleWords >= Math.max(1, Math.ceil(words.length * 0.35)) ||
    words.length <= 4
  );
}

function splitSparseLines(text: string) {
  return text
    .split(/\n+|•|;|—|–|\u2022/g)
    .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((line) => line.trim())
    .filter(Boolean);
}

export function proposeConceptsFromPages(input: {
  materialId: string;
  sourceLabel: string;
  pages: ExtractedMaterialPage[];
  limit?: number;
  mode?: "strict" | "relaxed";
}): ProposedConcept[] {
  const proposals: ProposedConcept[] = [];
  const seen = new Set<string>();
  const limit = input.limit ?? 12;
  const matcher = input.mode === "relaxed" ? looksLikeConceptRelaxed : looksLikeConcept;

  for (const page of input.pages) {
    const lines = (input.mode === "relaxed" ? splitSparseLines(page.text) : page.text.split(/\n+/).map((line) => line.trim()).filter(Boolean));
    lines.forEach((line, index) => {
      if (proposals.length >= limit || !matcher(line)) return;
      const name = cleanCandidate(line);
      const key = name.toLocaleLowerCase();
      if (!matcher(name) || seen.has(key)) return;
      seen.add(key);
      proposals.push({
        id: `proposal-${stablePart(`${input.materialId}:${key}`)}`,
        materialId: input.materialId,
        name,
        sourceLabel: input.sourceLabel,
        locator: page.pageNumber === 0 ? "Document outline" : `Page ${page.pageNumber}`,
        sourceExcerpt: excerptFor(lines, index, line),
      });
    });
  }
  return proposals;
}

const METADATA_STOPWORDS = new Set([
  "a", "an", "and", "the", "of", "to", "in", "on", "for", "with", "from",
  "week", "lecture", "notes", "note", "pdf", "syllabus", "chapter", "unit",
  "final", "midterm", "exam", "course", "intro", "introduction", "part",
  "section", "doc", "handout", "slides", "slide", "reading", "assignment",
]);

export function proposeConceptsFromMetadata(input: {
  materialId: string;
  sourceLabel: string;
  fileName?: string | null;
  limit?: number;
}): ProposedConcept[] {
  const limit = input.limit ?? 4;
  const raw = `${input.sourceLabel} ${input.fileName ?? ""}`
    .replace(/\.pdf$/i, " ")
    .replace(/[-_+/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return [];

  const phrases: string[] = [];
  const cleanedTitle = cleanCandidate(raw);
  if (cleanedTitle.length >= 3 && cleanedTitle.length <= 72) phrases.push(cleanedTitle);

  for (const token of raw.split(/\s+/)) {
    const word = token.replace(/[^A-Za-z&/-]/g, "");
    if (word.length < 4) continue;
    if (METADATA_STOPWORDS.has(word.toLocaleLowerCase())) continue;
    if (/^\d+$/.test(word)) continue;
    phrases.push(word[0].toUpperCase() + word.slice(1));
  }

  const proposals: ProposedConcept[] = [];
  const seen = new Set<string>();
  for (const phrase of phrases) {
    if (proposals.length >= limit) break;
    const name = cleanCandidate(phrase);
    const key = name.toLocaleLowerCase();
    if (!name || seen.has(key) || ADMINISTRATIVE.test(name)) continue;
    seen.add(key);
    proposals.push({
      id: `proposal-${stablePart(`${input.materialId}:meta:${key}`)}`,
      materialId: input.materialId,
      name,
      sourceLabel: input.sourceLabel,
      locator: "From filename",
      sourceExcerpt: `Suggested from the file title “${input.sourceLabel}”. Edit or remove anything that is not an exam concept.`,
    });
  }
  return proposals;
}

export function buildConfirmedMaterialModel(input: {
  proposals: ProposedConcept[];
  courseId: string;
  userId: string;
  nowIso: string;
  pages?: ExtractedMaterialPage[];
}) {
  const corpus = [
    ...(input.pages ?? []).map((page) => page.text),
    ...input.proposals.map((proposal) => `${proposal.name}\n${proposal.sourceExcerpt}`),
  ].join("\n");

  const concepts: Concept[] = input.proposals.map((proposal, index) => ({
    id: `c-source-${stablePart(`${input.courseId}:${proposal.name.toLocaleLowerCase()}`)}`,
    courseId: input.courseId,
    userId: input.userId,
    name: proposal.name,
    examImportance: scoreExamImportance({
      name: proposal.name,
      excerpt: proposal.sourceExcerpt,
      locator: proposal.locator,
      corpus,
      index,
      total: input.proposals.length,
    }),
    difficulty: scoreDifficulty(proposal.sourceExcerpt),
    estimatedMinutes: 18,
    mastery: 0,
    confidence: 0,
    predictedRetention: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
    retrievalAttempts: 0,
    successfulRetrievals: 0,
    failedRetrievals: 0,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  }));

  const uniqueScores = new Set(concepts.map((concept) => concept.examImportance.toFixed(2)));
  if (concepts.length > 1 && uniqueScores.size === 1) {
    concepts.forEach((concept, index) => {
      concept.examImportance = clamp(
        Number((concept.examImportance + (concepts.length - index - 1) * 0.02 - index * 0.01).toFixed(3)),
        0.35,
        0.95,
      );
    });
  }

  const proposalByName = new Map(input.proposals.map((proposal) => [proposal.name, proposal]));
  const prompts: Prompt[] = concepts.map((concept) => {
    const proposal = proposalByName.get(concept.name)!;
    return {
      id: `p-${concept.id}`,
      conceptId: concept.id,
      promptText: `Explain the central claim about ${concept.name} from the course source.`,
      modelAnswer: centralClaim(concept.name, proposal.sourceExcerpt),
    };
  });
  const learningActivities: LearningActivity[] = concepts.map((concept) =>
    buildActivity(concept, proposalByName.get(concept.name)!),
  );
  const relationships = inferRelationships(concepts, corpus);
  return { concepts, prompts, learningActivities, relationships };
}
